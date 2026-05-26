import { Router } from 'express';
import { findMatches, createMatchSession } from '../services/matchmaking.service.js';
import { lockCredits } from '../services/escrow.service.js';

const router = Router();

// Bir beceri için en iyi eşleşmeleri getir
router.get('/find/:skillId', async (req, res) => {
  try {
    const result = await findMatches(req.user.id, req.params.skillId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Eşleşme oturumu oluştur
router.post('/create', async (req, res) => {
  try {
    const { teacherId, skillId, scheduledAt, durationMinutes } = req.body;

    if (!teacherId || !skillId || !scheduledAt) {
      return res.status(400).json({ error: 'teacherId, skillId ve scheduledAt zorunludur' });
    }

    // Geçmiş tarih kontrolü
    if (new Date(scheduledAt) <= new Date()) {
      return res.status(400).json({ error: 'Oturum tarihi gelecekte olmali' });
    }

    const session = await createMatchSession({
      learnerId: req.user.id,
      teacherId,
      skillId,
      scheduledAt,
      durationMinutes: durationMinutes || 60,
    });

    // Escrow'u hemen kilitle
    const escrow = await lockCredits(session.id);

    // Socket bildirimi
    req.io?.to(teacherId).emit('match_request', {
      session,
      message: `${req.user.displayName} sizinle eşleşmek istiyor!`,
    });

    res.status(201).json({ session, escrow });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
