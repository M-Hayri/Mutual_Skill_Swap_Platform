import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const connectedUsers = new Map();

export function initSocketHandlers(io) {

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Kimlik dogrulama gerekli'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Gecersiz token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('[Socket] Baglandi:', socket.userId);
    connectedUsers.set(socket.userId, socket.id);
    socket.join(socket.userId);

    // ── Oturuma katıl ──────────────────────────────────────────
    socket.on('join_session', async ({ sessionId }) => {
      try {
        const session = await prisma.session.findFirst({
          where: {
            id: sessionId,
            OR: [{ teacherId: socket.userId }, { learnerId: socket.userId }],
          },
          include: {
            teacher: { select: { id: true, displayName: true } },
            learner:  { select: { id: true, displayName: true } },
          },
        });

        if (!session) {
          socket.emit('error', { message: 'Bu oturuma erisim yetkiniz yok' });
          return;
        }

        socket.join('session:' + sessionId);
        socket.currentSessionId = sessionId;

        // Mesaj geçmişini çek — sender join ile değil, ayrı sorguda
        const rawMessages = await prisma.chatMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
          take: 50,
        });

        // Gönderen kullanıcı bilgilerini toplu getir
        const senderIds = [...new Set(rawMessages.map(m => m.senderId).filter(Boolean))];
        const senders = senderIds.length > 0
          ? await prisma.user.findMany({ where: { id: { in: senderIds } }, select: { id: true, displayName: true } })
          : [];
        const senderMap = Object.fromEntries(senders.map(u => [u.id, u.displayName]));

        const history = rawMessages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderId ? (senderMap[m.senderId] || 'Kullanici') : 'Sistem',
          text: m.text,
          type: m.type,
          timestamp: m.createdAt,
        }));

        socket.emit('session_joined', {
          session,
          history,
          onlineUsers: getOnlineParticipants(session, connectedUsers),
        });

        socket.to('session:' + sessionId).emit('participant_joined', {
          userId: socket.userId,
          displayName: socket.userId === session.teacherId
            ? session.teacher.displayName
            : session.learner.displayName,
          timestamp: new Date().toISOString(),
        });

        await broadcastSystemMessage(io, prisma, sessionId,
          (socket.userId === session.teacherId ? session.teacher.displayName : session.learner.displayName) + ' odaya katildi'
        );
      } catch (err) {
        console.error('[Socket] join_session error:', err.message);
        socket.emit('error', { message: 'Oturuma katilirken hata olustu' });
      }
    });

    // ── Mesaj gönder ───────────────────────────────────────────
    socket.on('send_message', async ({ sessionId, text }) => {
      if (!text?.trim() || !sessionId) return;
      try {
        const session = await prisma.session.findFirst({
          where: {
            id: sessionId,
            OR: [{ teacherId: socket.userId }, { learnerId: socket.userId }],
            status: { in: ['CONFIRMED', 'ACTIVE'] },
          },
          include: {
            teacher: { select: { id: true, displayName: true } },
            learner:  { select: { id: true, displayName: true } },
          },
        });

        if (!session) {
          socket.emit('error', { message: 'Mesaj gonderilemedi: oturum aktif degil' });
          return;
        }

        const message = await prisma.chatMessage.create({
          data: {
            sessionId,
            senderId: socket.userId,
            text: text.trim().slice(0, 2000),
            type: 'text',
          },
        });

        const senderName = socket.userId === session.teacherId
          ? session.teacher.displayName
          : session.learner.displayName;

        io.to('session:' + sessionId).emit('new_message', {
          id: message.id,
          senderId: message.senderId,
          senderName,
          text: message.text,
          type: message.type,
          timestamp: message.createdAt,
        });
      } catch (err) {
        console.error('[Socket] send_message error:', err.message);
        socket.emit('error', { message: 'Mesaj gonderilemedi' });
      }
    });

    // ── Yazıyor göstergesi ─────────────────────────────────────
    socket.on('typing_start', ({ sessionId }) => {
      socket.to('session:' + sessionId).emit('user_typing', { userId: socket.userId, isTyping: true });
    });
    socket.on('typing_stop', ({ sessionId }) => {
      socket.to('session:' + sessionId).emit('user_typing', { userId: socket.userId, isTyping: false });
    });

    // ── Oturum başlat ──────────────────────────────────────────
    socket.on('session_start_confirm', async ({ sessionId }) => {
      try {
        const session = await prisma.session.findFirst({
          where: {
            id: sessionId,
            OR: [{ teacherId: socket.userId }, { learnerId: socket.userId }],
            status: 'CONFIRMED',
          },
        });
        if (!session) return;

        await prisma.session.update({
          where: { id: sessionId },
          data: { status: 'ACTIVE', actualStartAt: new Date() },
        });
        await prisma.sessionLog.create({
          data: { sessionId, event: 'session_started', actorId: socket.userId },
        });

        io.to('session:' + sessionId).emit('session_started', {
          sessionId,
          startedAt: new Date().toISOString(),
        });
        await broadcastSystemMessage(io, prisma, sessionId, 'Oturum baslatildi! Ogrenme zamani.');
      } catch (err) {
        console.error('[Socket] session_start_confirm error:', err.message);
      }
    });

    // ── Odadan ayrıl ───────────────────────────────────────────
    socket.on('leave_session', ({ sessionId }) => {
      socket.leave('session:' + sessionId);
      socket.to('session:' + sessionId).emit('participant_left', {
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.userId);
      if (socket.currentSessionId) {
        socket.to('session:' + socket.currentSessionId).emit('participant_left', {
          userId: socket.userId,
          timestamp: new Date().toISOString(),
        });
      }
      console.log('[Socket] Ayrildi:', socket.userId);
    });
  });

  return io;
}

async function broadcastSystemMessage(io, prisma, sessionId, text) {
  try {
    const msg = await prisma.chatMessage.create({
      data: { sessionId, senderId: null, text, type: 'system' },
    });
    io.to('session:' + sessionId).emit('new_message', {
      id: msg.id,
      senderId: null,
      senderName: 'Sistem',
      text: msg.text,
      type: 'system',
      timestamp: msg.createdAt,
    });
  } catch (err) {
    console.error('[Socket] broadcastSystemMessage error:', err.message);
  }
}

function getOnlineParticipants(session, connectedUsers) {
  const online = [];
  if (connectedUsers.has(session.teacherId)) online.push(session.teacherId);
  if (connectedUsers.has(session.learnerId)) online.push(session.learnerId);
  return online;
}

export function notifyUser(io, userId, event, data) {
  io.to(userId).emit(event, data);
}
