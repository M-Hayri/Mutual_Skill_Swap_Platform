import { Router } from 'express';
import { processReview } from '../services/trust.service.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { sessionId, revieweeId, ...reviewData } = req.body;
    const review = await processReview({
      sessionId,
      reviewerId: req.user.id,
      revieweeId,
      ...reviewData,
    });
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
