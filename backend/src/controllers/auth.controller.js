import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Prisma } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET env degiskeni tanimli degil. .env dosyasini kontrol edin.');
  }
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ── Kayıt ────────────────────────────────────────────────────
export async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { email, username, password, displayName } = req.body;

  try {
    // Mevcut kullanıcı kontrolü
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });

    if (existing) {
      const field = existing.email === email ? 'e-posta adresi' : 'kullanici adi';
      return res.status(409).json({ message: 'Bu ' + field + ' zaten kullaniliyor.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName,
        zaman_kredisi_bakiyesi: 2.0,
        gorunmez_guven_skoru: 0.5,
      },
      select: {
        id: true, email: true, username: true,
        displayName: true, zaman_kredisi_bakiyesi: true, createdAt: true,
      },
    });

    const token = generateToken(user.id);
    console.log('[Auth] Yeni kayit:', user.email);
    res.status(201).json({ user, token });

  } catch (err) {
    console.error('[Auth] register hatasi:', err);

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ message: 'Bu e-posta veya kullanici adi zaten kayitli.' });
    }
    if (err.message.includes('JWT_SECRET')) {
      return res.status(500).json({ message: 'Sunucu yapilandirma hatasi. Yoneticiyle iletisime gecin.' });
    }
    res.status(500).json({ message: 'Kayit sirasinda beklenmeyen hata. Lutfen tekrar deneyin.' });
  }
}

// ── Giriş ─────────────────────────────────────────────────────
export async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'E-posta veya sifre hatali.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'E-posta veya sifre hatali.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Hesabiniz devre disi birakilmis. Destek icin iletisime gecin.' });
    }

    // lastLoginAt güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken(user.id);
    console.log('[Auth] Giris basarili:', user.email);

    // Hassas alanları çıkar
    const { passwordHash, gorunmez_guven_skoru, ...safeUser } = user;
    res.json({ user: safeUser, token });

  } catch (err) {
    console.error('[Auth] login hatasi:', err);

    if (err.message.includes('JWT_SECRET')) {
      return res.status(500).json({ message: 'Sunucu yapilandirma hatasi. Yoneticiyle iletisime gecin.' });
    }
    res.status(500).json({ message: 'Giris sirasinda beklenmeyen hata. Lutfen tekrar deneyin.' });
  }
}

// ── Mevcut kullanıcı ──────────────────────────────────────────
export async function getMe(req, res) {
  res.json({ user: req.user });
}
