import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// ── Prisma hatasını anlamlı mesaja çevir ──────────────────────
function handlePrismaError(err, res) {
  console.error('[Skill Route Error]', err.message || err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({ message: 'Bu beceriyi zaten eklediniz.' });
      case 'P2025':
        return res.status(404).json({ message: 'Kayit bulunamadi.' });
      case 'P2003':
        return res.status(400).json({ message: 'Gecersiz beceri ID\'si.' });
      default:
        return res.status(400).json({ message: `Veritabani hatasi: ${err.code}` });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    const msg = err.message;
    if (msg.includes('SkillLevel')) {
      return res.status(400).json({
        message: 'Gecersiz seviye degeri. BEGINNER, INTERMEDIATE, ADVANCED veya EXPERT olmali.',
      });
    }
    if (msg.includes('UserSkillRole')) {
      return res.status(400).json({
        message: 'Gecersiz rol. TEACHER veya LEARNER olmali.',
      });
    }
    if (msg.includes('Null constraint')) {
      return res.status(400).json({ message: 'Zorunlu alanlar eksik.' });
    }
    return res.status(400).json({ message: 'Gonderilen veriler gecersiz. Tum alanlari kontrol edin.' });
  }

  return res.status(500).json({ message: 'Sunucu hatasi. Lutfen tekrar deneyin.' });
}

// ── Tüm kategorileri listele ──────────────────────────────────
router.get('/categories', async (_req, res) => {
  try {
    const categories = await prisma.skillCategory.findMany({
      where: { isActive: true },
      include: { _count: { select: { skills: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    handlePrismaError(err, res);
  }
});

// ── Beceri ara ────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q, categoryId } = req.query;
    const skills = await prisma.skill.findMany({
      where: {
        isActive: true,
        ...(q && { name: { contains: q, mode: 'insensitive' } }),
        ...(categoryId && { categoryId }),
      },
      include: { category: true },
      take: 20,
    });
    res.json(skills);
  } catch (err) {
    handlePrismaError(err, res);
  }
});

// ── Kullanıcının becerilerini getir ───────────────────────────
router.get('/my', async (req, res) => {
  try {
    const userSkills = await prisma.userSkill.findMany({
      where: { userId: req.user.id, isActive: true },
      include: { skill: { include: { category: true } } },
    });
    res.json(userSkills);
  } catch (err) {
    handlePrismaError(err, res);
  }
});

// ── Beceri ekle ───────────────────────────────────────────────
router.post('/my', async (req, res) => {
  try {
    const {
      skillId, role, level, sessionDurationMinutes,
      teachingFormat, description, currentLevel, targetLevel, learningGoal,
    } = req.body;

    // ── Temel validasyon ──────────────────────────────────────
    if (!skillId) {
      return res.status(400).json({ message: 'Beceri secilmedi.' });
    }
    if (!role || !['TEACHER', 'LEARNER'].includes(role)) {
      return res.status(400).json({ message: 'Gecersiz rol. TEACHER veya LEARNER olmali.' });
    }

    const validLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

    // Efektif level: TEACHER için level, LEARNER için currentLevel fallback
    const effectiveLevel = (level && validLevels.includes(level))
      ? level
      : (currentLevel && validLevels.includes(currentLevel))
        ? currentLevel
        : null;

    if (!effectiveLevel) {
      return res.status(400).json({
        message: 'Seviye secilmedi. Lutfen bir seviye secin (Baslangic, Orta, Ileri veya Uzman).',
      });
    }

    // null-safe enum alanları
    const safeCurrentLevel = currentLevel && validLevels.includes(currentLevel) ? currentLevel : null;
    const safeTargetLevel  = targetLevel  && validLevels.includes(targetLevel)  ? targetLevel  : null;

    // Becerinin var olduğunu doğrula
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) {
      return res.status(404).json({ message: 'Secilen beceri bulunamadi.' });
    }

    // Upsert: varsa güncelle, yoksa ekle
    const existing = await prisma.userSkill.findUnique({
      where: { userId_skillId_role: { userId: req.user.id, skillId, role } },
    });

    let userSkill;
    if (existing) {
      userSkill = await prisma.userSkill.update({
        where: { id: existing.id },
        data: {
          level: effectiveLevel,
          isActive: true,
          sessionDurationMinutes: sessionDurationMinutes ?? existing.sessionDurationMinutes,
          teachingFormat:         teachingFormat         ?? existing.teachingFormat,
          description:            description            ?? existing.description,
          currentLevel:           safeCurrentLevel       ?? existing.currentLevel,
          targetLevel:            safeTargetLevel        ?? existing.targetLevel,
          learningGoal:           learningGoal           ?? existing.learningGoal,
        },
        include: { skill: { include: { category: true } } },
      });
    } else {
      userSkill = await prisma.userSkill.create({
        data: {
          userId: req.user.id,
          skillId,
          role,
          level:                  effectiveLevel,
          sessionDurationMinutes: sessionDurationMinutes ?? null,
          teachingFormat:         teachingFormat         ?? null,
          description:            description            ?? null,
          currentLevel:           safeCurrentLevel,
          targetLevel:            safeTargetLevel,
          learningGoal:           learningGoal           ?? null,
        },
        include: { skill: { include: { category: true } } },
      });
    }

    res.status(201).json(userSkill);
  } catch (err) {
    handlePrismaError(err, res);
  }
});

// ── Beceriyi kaldır ───────────────────────────────────────────
router.delete('/my/:userSkillId', async (req, res) => {
  try {
    // Kullanıcının kendi becerisi mi kontrol et
    const existing = await prisma.userSkill.findFirst({
      where: { id: req.params.userSkillId, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Beceri bulunamadi veya erisim yetkiniz yok.' });
    }

    await prisma.userSkill.update({
      where: { id: req.params.userSkillId },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Beceri kaldirildi.' });
  } catch (err) {
    handlePrismaError(err, res);
  }
});

export default router;
