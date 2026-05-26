import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import skillRoutes from './routes/skill.routes.js';
import sessionRoutes from './routes/session.routes.js';
import matchRoutes from './routes/match.routes.js';
import reviewRoutes from './routes/review.routes.js';
import disputeRoutes from './routes/dispute.routes.js';
import notificationRoutes from './routes/notification.routes.js';

import { initSocketHandlers } from './socket/socket.handler.js';
import { errorHandler } from './middleware/error.middleware.js';
import { authMiddleware } from './middleware/auth.middleware.js';

dotenv.config();

// ── ENV KONTROLÜ ─────────────────────────────────────────────
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('\n❌ Eksik env degiskenleri:', missingVars.join(', '));
  console.error('   .env dosyasini kontrol edin (.env.example baz alin)\n');
  process.exit(1);
}


const app = express();
const httpServer = createServer(app);

// ============================================================
// SOCKET.IO KURULUMU
// ============================================================
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// io nesnesini req'e ekle (controller'lar bildirim gönderebilsin)
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting — DDoS ve brute-force koruması
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 300,
  message: { error: 'Çok fazla istek. 15 dakika sonra tekrar deneyin.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Çok fazla giriş denemesi.' },
});

app.use('/api/', globalLimiter);

// ============================================================
// ROTALAR
// ============================================================
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/skills', authMiddleware, skillRoutes);
app.use('/api/sessions', authMiddleware, sessionRoutes);
app.use('/api/match', authMiddleware, matchRoutes);
app.use('/api/reviews', authMiddleware, reviewRoutes);
app.use('/api/disputes', authMiddleware, disputeRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);

// Sağlık kontrolü
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    platform: 'Mutual Learn by Exchange',
    version: '1.0.0-mvp',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// SOCKET HANDLER BAŞLATMA
// ============================================================
initSocketHandlers(io);

// ============================================================
// HATA YÖNETİMİ
// ============================================================
app.use(errorHandler);

// ============================================================
// SUNUCU BAŞLATMA
// ============================================================
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Mutual Learn API çalışıyor: http://localhost:${PORT}`);
  console.log(`📡 Socket.IO hazır`);
  console.log(`🌍 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
});

export { io };
