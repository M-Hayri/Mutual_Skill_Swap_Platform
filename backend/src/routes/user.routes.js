import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { resolveDisputeAutomatically } from '../services/trust.service.js';

const prisma = new PrismaClient();

// ── User Router ─────────────────────────────────────────────
const userRouter = Router();

userRouter.get('/profile/:username', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: {
      id: true, displayName: true, username: true,
      avatarUrl: true, bio: true, timezone: true,
      toplam_ogretim_saati: true, toplam_ogrenme_saati: true,
      tamamlama_orani: true, createdAt: true,
      availability: true,
      skills: {
        where: { isActive: true },
        include: { skill: { include: { category: true } } },
      },
    },
  });
  if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });
  res.json(user);
});


userRouter.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { not: req.user.id },
      OR: [
        { displayName: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, displayName: true, username: true,
      avatarUrl: true, bio: true,
      toplam_ogretim_saati: true, tamamlama_orani: true,
      availability: true,
      skills: {
        where: { isActive: true },
        include: { skill: { include: { category: true } } },
      },
    },
    take: 20,
  });
  res.json(users);
});

userRouter.get('/dashboard', async (req, res) => {
  const userId = req.user.id;
  const [user, upcomingSessions, recentSessions, skillCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, displayName: true, username: true, avatarUrl: true,
        zaman_kredisi_bakiyesi: true, toplam_ogretim_saati: true,
        toplam_ogrenme_saati: true, tamamlama_orani: true,
      },
    }),
    prisma.session.findMany({
      where: {
        OR: [{ teacherId: userId }, { learnerId: userId }],
        status: { in: ['CONFIRMED', 'ACTIVE'] },
        scheduledAt: { gte: new Date() },
      },
      include: {
        teacher: { select: { id: true, displayName: true, avatarUrl: true } },
        learner: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    }),
    prisma.session.findMany({
      where: {
        OR: [{ teacherId: userId }, { learnerId: userId }],
        status: 'COMPLETED',
      },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    }),
    prisma.userSkill.count({ where: { userId, isActive: true } }),
  ]);
  res.json({ user, upcomingSessions, recentSessions, skillCount });
});

userRouter.patch('/me', async (req, res) => {
  const { displayName, bio, timezone, availability } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { displayName, bio, timezone },
    select: { id: true, displayName: true, bio: true, timezone: true },
  });
  if (availability) {
    await prisma.userAvailability.deleteMany({ where: { userId: req.user.id } });
    await prisma.userAvailability.createMany({
      data: availability.map(a => ({ ...a, userId: req.user.id })),
    });
  }
  res.json(updated);
});

// ── Dispute Router ──────────────────────────────────────────
const disputeRouter = Router();

disputeRouter.post('/', async (req, res) => {
  try {
    const { sessionId, reason, description } = req.body;
    const dispute = await prisma.dispute.create({
      data: { sessionId, raisedById: req.user.id, reason, description },
    });
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'DISPUTED' },
    });
    const resolution = await resolveDisputeAutomatically(dispute.id);
    res.status(201).json({ dispute, resolution });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Notification Router ─────────────────────────────────────
const notificationRouter = Router();

notificationRouter.get('/', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  res.json(notifications);
});

notificationRouter.patch('/:id/read', async (req, res) => {
  await prisma.notification.update({
    where: { id: req.params.id, userId: req.user.id },
    data: { isRead: true },
  });
  res.json({ success: true });
});

export { userRouter, disputeRouter, notificationRouter };
export default userRouter;
