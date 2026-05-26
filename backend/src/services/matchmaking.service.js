/**
 * MODÜL A: Akıllı Eşleştirme (Matchmaking) Motoru
 *
 * Eşleştirme algoritması 5 temel kriter üzerinden çalışır:
 *   1. Beceri uyumu       (w=0.35)
 *   2. Seviye uyumu       (w=0.20)
 *   3. Zaman uygunluğu   (w=0.20)
 *   4. Takas dengesi      (w=0.15)
 *   5. Güven skoru        (w=0.10)
 *
 * Toplam = 1.0
 * Eşleşme için minimum skor eşiği: 0.40
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// AĞIRLIK KONFİGÜRASYONU
// ============================================================
const WEIGHTS = {
  SKILL_MATCH: 0.35,
  LEVEL_MATCH: 0.20,
  TIME_AVAIL: 0.20,
  SWAP_BALANCE: 0.15,
  TRUST_SCORE: 0.10,
};

const MIN_MATCH_SCORE = 0.40; // Bu eşiğin altındaki eşleşmeler önerilmez
const MAX_RESULTS = 10;       // Kullanıcıya sunulacak maksimum öneri sayısı

// ============================================================
// ANA EŞLEŞTİRME FONKSİYONU
// ============================================================

/**
 * Bir kullanıcı için en uygun öğretmen/öğrenci adaylarını bulur.
 *
 * @param {string} userId - Eşleşme arayan kullanıcının ID'si
 * @param {string} targetSkillId - Öğrenmek istediği beceri ID'si
 * @param {object} options - Ek filtreler
 * @returns {Array} Skorlanmış ve sıralanmış aday listesi
 */
export async function findMatches(userId, targetSkillId, options = {}) {
  // 1. Kullanıcıyı ve profilini yükle
  const seeker = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: { include: { skill: true } },
      availability: true,
    },
  });

  if (!seeker) throw new Error('Kullanıcı bulunamadı');

  // Kullanıcının öğretebileceği beceriler
  const seekerTeachableSkills = seeker.skills
    .filter(us => us.role === 'TEACHER' && us.isActive)
    .map(us => us.skillId);

  if (seekerTeachableSkills.length === 0) {
    return {
      matches: [],
      reason: 'Önce öğretebileceğiniz bir beceri eklemeniz gerekiyor.',
    };
  }

  // 2. Hedef beceriyi öğretebilen kullanıcıları bul
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: userId },
      isActive: true,
      skills: {
        some: {
          skillId: targetSkillId,
          role: 'TEACHER',
          isActive: true,
        },
      },
      // Öğreten kişinin de öğrenmek istediği bir şey olmalı (takas için)
      // MVP'de bu zorunlu değil ama bonus puan verir
    },
    include: {
      skills: { include: { skill: true } },
      availability: true,
    },
  });

  if (candidates.length === 0) {
    return {
      matches: [],
      reason: 'Bu beceri için şu an müsait öğreten bulunamadı.',
    };
  }

  // 3. Her adayı skorla
  const scoredMatches = await Promise.all(
    candidates.map(candidate =>
      scoreCandidate(seeker, candidate, targetSkillId, seekerTeachableSkills)
    )
  );

  // 4. Eşik altını filtrele, skora göre sırala
  const validMatches = scoredMatches
    .filter(m => m.totalScore >= MIN_MATCH_SCORE)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, MAX_RESULTS);

  return {
    matches: validMatches,
    totalCandidates: candidates.length,
    validCount: validMatches.length,
  };
}

// ============================================================
// ADAY SKORLAMA MOTORU
// ============================================================

async function scoreCandidate(seeker, candidate, targetSkillId, seekerTeachableSkills) {
  const scores = {};
  const reasons = {};

  // ── KRITER 1: BECERİ UYUMU ──────────────────────────────
  // Adayın öğrenmek istediği bir şey var mı ve seeker öğretebiliyor mu?
  const candidateLearnerSkills = candidate.skills
    .filter(us => us.role === 'LEARNER' && us.isActive)
    .map(us => us.skillId);

  const commonTeachable = seekerTeachableSkills.filter(
    skillId => candidateLearnerSkills.includes(skillId)
  );

  if (commonTeachable.length > 0) {
    // Direkt karşılıklı takas mümkün
    scores.skillMatch = 1.0;
    reasons.skillMatch = `Karşılıklı takas mümkün: ${commonTeachable.length} ortak beceri`;
  } else {
    // Tek yönlü (kredi bazlı) - hala mümkün ama daha düşük skor
    scores.skillMatch = 0.4;
    reasons.skillMatch = 'Kredi bazlı eşleşme (tek yönlü)';
  }

  // ── KRITER 2: SEVİYE UYUMU ──────────────────────────────
  const candidateTeacherSkill = candidate.skills.find(
    us => us.skillId === targetSkillId && us.role === 'TEACHER'
  );
  const seekerLearnerSkill = seeker.skills.find(
    us => us.skillId === targetSkillId && us.role === 'LEARNER'
  );

  if (candidateTeacherSkill && seekerLearnerSkill) {
    scores.levelMatch = calculateLevelCompatibility(
      seekerLearnerSkill.currentLevel,
      seekerLearnerSkill.targetLevel,
      candidateTeacherSkill.level
    );
    reasons.levelMatch = `Öğreten seviyesi: ${candidateTeacherSkill.level}`;
  } else {
    scores.levelMatch = 0.5;
    reasons.levelMatch = 'Seviye bilgisi eksik';
  }

  // ── KRITER 3: ZAMAN UYGUNLUĞU ──────────────────────────
  scores.timeAvail = calculateTimeCompatibility(
    seeker.availability,
    candidate.availability,
    seeker.timezone,
    candidate.timezone
  );
  reasons.timeAvail = scores.timeAvail > 0.7
    ? 'Yüksek zaman uyumu'
    : scores.timeAvail > 0.4
    ? 'Orta düzey zaman uyumu'
    : 'Sınırlı zaman uyumu';

  // ── KRITER 4: TAKAS DENGESİ ──────────────────────────────
  // Öğretim/öğrenme oranı dengeli kullanıcıları tercih et
  scores.swapBalance = calculateSwapBalance(seeker, candidate);
  reasons.swapBalance = `Bakiye dengesi skoru`;

  // ── KRITER 5: GÜVEN SKORU ──────────────────────────────
  // Görünmez güven skoru (0.0 - 1.0)
  scores.trustScore = candidate.gorunmez_guven_skoru;
  reasons.trustScore = `Sistem güven skoru: ${(candidate.gorunmez_guven_skoru * 100).toFixed(0)}%`;

  // ── TOPLAM AĞIRLIKLI SKOR ────────────────────────────────
  const totalScore =
    scores.skillMatch * WEIGHTS.SKILL_MATCH +
    scores.levelMatch * WEIGHTS.LEVEL_MATCH +
    scores.timeAvail * WEIGHTS.TIME_AVAIL +
    scores.swapBalance * WEIGHTS.SWAP_BALANCE +
    scores.trustScore * WEIGHTS.TRUST_SCORE;

  // Reciprocal teaching skill (karşılıklı takas için hangi beceri)
  const reciprocalSkillId = commonTeachable[0] || null;

  return {
    candidate: {
      id: candidate.id,
      displayName: candidate.displayName,
      username: candidate.username,
      avatarUrl: candidate.avatarUrl,
      bio: candidate.bio,
      totalOgretimSaati: candidate.toplam_ogretim_saati,
      tamamlamaOrani: candidate.tamamlama_orani,
      // Güven skoru kullanıcıya gösterilmez
      teacherSkillInfo: candidateTeacherSkill ? {
        level: candidateTeacherSkill.level,
        sessionDuration: candidateTeacherSkill.sessionDurationMinutes,
        format: candidateTeacherSkill.teachingFormat,
        description: candidateTeacherSkill.description,
      } : null,
    },
    totalScore: Math.round(totalScore * 100) / 100,
    breakdown: {
      skillMatch: Math.round(scores.skillMatch * 100),
      levelMatch: Math.round(scores.levelMatch * 100),
      timeAvail: Math.round(scores.timeAvail * 100),
      swapBalance: Math.round(scores.swapBalance * 100),
      trustScore: Math.round(scores.trustScore * 100),
    },
    reasons,
    isDirectSwap: commonTeachable.length > 0,
    reciprocalSkillId,
  };
}

// ============================================================
// YARDIMCI FONKSİYONLAR
// ============================================================

function calculateLevelCompatibility(learnerCurrentLevel, learnerTargetLevel, teacherLevel) {
  const levelOrder = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2, EXPERT: 3 };

  const teacherLvl = levelOrder[teacherLevel] ?? 1;
  const currentLvl = levelOrder[learnerCurrentLevel] ?? 0;
  const targetLvl = levelOrder[learnerTargetLevel] ?? currentLvl + 1;

  // Öğreten, hedef seviyede veya üstünde olmalı
  if (teacherLvl >= targetLvl) {
    // Çok yüksek seviye farkı da iyi değil (iletişim güçlüğü)
    const gap = teacherLvl - currentLvl;
    if (gap === 1) return 1.0;   // Mükemmel
    if (gap === 2) return 0.85;  // Çok iyi
    if (gap >= 3) return 0.65;   // İyi ama iletişim zorlaşabilir
  }

  // Öğreten, hedef seviyenin altındaysa
  const deficit = targetLvl - teacherLvl;
  if (deficit === 1) return 0.5;  // Kabul edilebilir
  return 0.2;                      // Yetersiz
}

function calculateTimeCompatibility(seekerAvail, candidateAvail, seekerTz, candidateTz) {
  if (!seekerAvail?.length || !candidateAvail?.length) return 0.5; // Bilinmiyor

  // Timezone farkını hesapla (basit yaklaşım)
  // Gelişmiş versiyonda moment-timezone kullanılacak
  const tzPenalty = seekerTz === candidateTz ? 0 : 0.1;

  // Gün ve saat çakışması hesapla
  let overlapCount = 0;
  let totalChecks = 0;

  for (const sa of seekerAvail) {
    for (const ca of candidateAvail) {
      if (sa.dayOfWeek !== ca.dayOfWeek) continue;
      totalChecks++;

      const seekerStart = timeToMinutes(sa.startTime);
      const seekerEnd = timeToMinutes(sa.endTime);
      const candStart = timeToMinutes(ca.startTime);
      const candEnd = timeToMinutes(ca.endTime);

      const overlapStart = Math.max(seekerStart, candStart);
      const overlapEnd = Math.min(seekerEnd, candEnd);

      if (overlapEnd - overlapStart >= 60) { // En az 1 saat çakışma
        overlapCount++;
      }
    }
  }

  if (totalChecks === 0) return 0.4;

  const rawScore = overlapCount / Math.max(seekerAvail.length, 1);
  return Math.min(1.0, Math.max(0, rawScore - tzPenalty));
}

function calculateSwapBalance(seeker, candidate) {
  // Her iki tarafın da dengeli bir öğretme/öğrenme geçmişi olmasını tercih et
  const seekerRatio = seeker.toplam_ogretim_saati /
    Math.max(1, seeker.toplam_ogretim_saati + seeker.toplam_ogrenme_saati);
  const candidateRatio = candidate.toplam_ogretim_saati /
    Math.max(1, candidate.toplam_ogretim_saati + candidate.toplam_ogrenme_saati);

  // İdeal oran 0.5 (öğretme = öğrenme)
  // İkisi de aktif öğreten ise güzel
  const seekerBalance = 1 - Math.abs(seekerRatio - 0.5) * 2;
  const candidateBalance = 1 - Math.abs(candidateRatio - 0.5) * 2;

  return (seekerBalance + candidateBalance) / 2;
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// ============================================================
// EŞLEŞTİRME İSTEĞİ OLUŞTURMA
// ============================================================

/**
 * İki kullanıcı arasında Session kaydı oluşturur.
 * Escrow servisi ayrıca çağrılmalıdır.
 */
export async function createMatchSession(data) {
  const {
    teacherId,
    learnerId,
    skillId,
    scheduledAt,
    durationMinutes = 60,
    matchScore,
    matchReasons,
  } = data;

  // Becerinin zaman çarpanını al
  const skill = await prisma.skill.findUnique({ where: { id: skillId } });
  if (!skill) throw new Error('Beceri bulunamadı');

  const creditAmount = (durationMinutes / 60) * skill.zaman_carpani;

  const scheduledEnd = new Date(
    new Date(scheduledAt).getTime() + durationMinutes * 60 * 1000
  );

  const session = await prisma.session.create({
    data: {
      teacherId,
      learnerId,
      skillId,
      scheduledAt: new Date(scheduledAt),
      scheduledEnd,
      durationMinutes,
      creditAmount,
      zaman_carpani: skill.zaman_carpani,
      matchScore,
      matchReasons,
      status: 'MATCHED',
    },
    include: {
      teacher: { select: { id: true, displayName: true, email: true } },
      learner: { select: { id: true, displayName: true, email: true } },
    },
  });

  return session;
}
