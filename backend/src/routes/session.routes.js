import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { confirmCompletion, refundCredits } from '../services/escrow.service.js';
import { handleCancellation } from '../services/trust.service.js';

const prisma = new PrismaClient();
const router = Router();

// Kullanıcının oturumlarını listele
router.get('/', async (req, res) => {
  const { status, role } = req.query;
  const userId = req.user.id;

  const where = {
    OR: [{ teacherId: userId }, { learnerId: userId }],
  };
  if (status) where.status = status;
  if (role === 'teacher') { delete where.OR; where.teacherId = userId; }
  if (role === 'learner') { delete where.OR; where.learnerId = userId; }

  const sessions = await prisma.session.findMany({
    where,
    include: {
      teacher: { select: { id: true, displayName: true, avatarUrl: true } },
      learner: { select: { id: true, displayName: true, avatarUrl: true } },
      escrow: { select: { status: true, amount: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  res.json(sessions);
});

// Oturum detayı
router.get('/:id', async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: {
      teacher: { select: { id: true, displayName: true, avatarUrl: true, bio: true } },
      learner: { select: { id: true, displayName: true, avatarUrl: true } },
      escrow: true,
      reviews: true,
      logs: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });

  const isParticipant = [session.teacherId, session.learnerId].includes(req.user.id);
  if (!isParticipant) return res.status(403).json({ error: 'Erişim yetkiniz yok' });

  res.json(session);
});

// Oturumu onayla (başlamadan önce her iki taraf onaylar)
router.post('/:id/confirm', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });

    const isTeacher = session.teacherId === req.user.id;
    const isLearner = session.learnerId === req.user.id;
    if (!isTeacher && !isLearner) return res.status(403).json({ error: 'Yetki yok' });

    const updateData = {};
    if (isTeacher) updateData.teacherConfirmed = true;
    if (isLearner) updateData.learnerConfirmed = true;

    const updated = await prisma.session.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // Her ikisi de onayladıysa ACTIVE'e geç
    if (updated.teacherConfirmed && updated.learnerConfirmed) {
      await prisma.session.update({
        where: { id: req.params.id },
        data: { status: 'ACTIVE', actualStartAt: new Date() },
      });
    }

    res.json({ success: true, session: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Oturumu tamamla
router.post('/:id/complete', async (req, res) => {
  try {
    const result = await confirmCompletion(req.params.id, req.user.id);

    // Bildirim gönder
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    const otherId = session.teacherId === req.user.id ? session.learnerId : session.teacherId;
    req.io?.to(otherId).emit('completion_requested', { sessionId: req.params.id });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Oturumu iptal et
router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await handleCancellation(req.params.id, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
