/**
 * MODÜL C: Güven Skoru Motoru & Otomatik Hakemlik
 *
 * Güven Skoru (0.0 - 1.0):
 *   - Kullanıcılar göremez
 *   - Sistem her davranış olayında günceller
 *   - Eşleştirme algoritması ağırlıklı olarak kullanır
 *
 * Davranış olayları ve delta değerleri:
 *   no_show               → -0.15
 *   late_cancellation     → -0.08  (24 saat öncesi)
 *   early_cancellation    → -0.02  (48+ saat öncesi)
 *   positive_completion   → +0.05
 *   excellent_review      → +0.03
 *   dispute_lost          → -0.12
 *   dispute_won           → +0.02
 */

import { PrismaClient } from '@prisma/client';
import { refundCredits, lockCredits } from './escrow.service.js';

const prisma = new PrismaClient();

// ============================================================
// GÜVEN SKORU DELTA TABLOSU
// ============================================================
const TRUST_DELTAS = {
  no_show:                -0.15,
  late_cancellation:      -0.08,   // 24 saat içi iptal
  early_cancellation:     -0.02,   // 48+ saat öncesi iptal
  positive_completion:    +0.05,
  excellent_review:       +0.03,   // 4.5+ ortalama puan
  poor_review:            -0.04,   // 2.0 altı ortalama puan
  dispute_lost:           -0.12,
  dispute_won:            +0.02,
  late_arrival:           -0.03,   // Geç katılım
};

const MIN_TRUST = 0.05;
const MAX_TRUST = 1.0;

// ============================================================
// GÜVEN SKORU GÜNCELLEME
// ============================================================

/**
 * Bir davranış olayı sonucunda kullanıcının güven skorunu günceller.
 *
 * @param {string} userId
 * @param {string} event - TRUST_DELTAS anahtarlarından biri
 * @param {string|null} sessionId
 */
export async function updateTrustScore(userId, event, sessionId = null) {
  const delta = TRUST_DELTAS[event];
  if (delta === undefined) throw new Error(`Bilinmeyen güven olayı: ${event}`);

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Kullanıcı bulunamadı');

    const eskiSkor = user.gorunmez_guven_skoru;
    const yeniSkor = Math.max(MIN_TRUST, Math.min(MAX_TRUST, eskiSkor + delta));

    await tx.user.update({
      where: { id: userId },
      data: { gorunmez_guven_skoru: yeniSkor },
    });

    // Audit log
    await tx.trustScoreLog.create({
      data: {
        userId,
        eskiSkor,
        yeniSkor,
        delta,
        reason: event,
        sessionId,
      },
    });

    return { userId, eskiSkor, yeniSkor, delta, event };
  });
}

// ============================================================
// GELMEME (NO-SHOW) TRIGGER
// ============================================================

/**
 * Oturum başlama saatinden X dakika sonra katılım olmamışsa tetiklenir.
 * Scheduler (cron) tarafından her 5 dakikada bir çağrılmalıdır.
 */
export async function checkNoShows() {
  const noShowThresholdMinutes = 15; // 15 dakika sonra gelmemişse no-show
  const cutoffTime = new Date(Date.now() - noShowThresholdMinutes * 60 * 1000);

  const overdueSessions = await prisma.session.findMany({
    where: {
      status: 'CONFIRMED',
      scheduledAt: { lte: cutoffTime },
    },
    include: { escrow: true },
  });

  const results = [];

  for (const session of overdueSessions) {
    // No-show olarak işaretle
    await prisma.session.update({
      where: { id: session.id },
      data: { status: 'DISPUTED' },
    });

    // Her iki tarafa da ceza uygula
    // (Gerçekte hangi tarafın gelmediği loglardan anlaşılır)
    // MVP'de her ikisine de uygula; Aşama 2'de check-in mekanizması gelecek
    await updateTrustScore(session.teacherId, 'no_show', session.id);
    await updateTrustScore(session.learnerId, 'no_show', session.id);

    // Escrow'u iade et
    if (session.escrow?.status === 'LOCKED') {
      await refundCredits(session.id, 'no_show_auto_refund');
    }

    // Log
    await prisma.sessionLog.create({
      data: {
        sessionId: session.id,
        event: 'no_show_detected',
        metadata: { detectedAt: new Date().toISOString() },
      },
    });

    results.push({ sessionId: session.id, action: 'no_show_processed' });
  }

  return results;
}

// ============================================================
// DEĞERLENDIRME İŞLEME
// ============================================================

/**
 * Bir değerlendirme kaydedildikten sonra güven skorunu günceller.
 */
export async function processReview(reviewData) {
  const {
    sessionId,
    reviewerId,
    revieweeId,
    zamanindaGeldiMi,
    iletisimKalitesi,
    konuHakimiyeti,
    anlatimNetligi,
    tekrarEslesirmekIster,
    gecikmeDakika,
    comment,
    isAnonymous,
  } = reviewData;

  // Ortalama skor hesapla
  const scores = [iletisimKalitesi, konuHakimiyeti, anlatimNetligi].filter(Boolean);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  // 0.0 - 1.0 arası normalleştir
  const computedScore = avgScore ? (avgScore - 1) / 4 : null;

  const review = await prisma.review.create({
    data: {
      sessionId,
      reviewerId,
      revieweeId,
      zamanindaGeldiMi,
      iletisimKalitesi,
      konuHakimiyeti,
      anlatimNetligi,
      tekrarEslesirmekIster,
      gecikmeDakika,
      comment,
      isAnonymous,
      computedScore,
    },
  });

  // Güven skoru etkisi
  if (computedScore !== null) {
    if (computedScore >= 0.9) {
      await updateTrustScore(revieweeId, 'excellent_review', sessionId);
    } else if (computedScore < 0.4) {
      await updateTrustScore(revieweeId, 'poor_review', sessionId);
    }
  }

  if (gecikmeDakika && gecikmeDakika > 10) {
    await updateTrustScore(revieweeId, 'late_arrival', sessionId);

    await prisma.user.update({
      where: { id: revieweeId },
      data: { gec_katilim_sayisi: { increment: 1 } },
    });
  }

  return review;
}

// ============================================================
// OTOMATİK HAKEMLİK SİSTEMİ
// ============================================================

/**
 * Uyuşmazlık durumunda sistem otomatik karar verir.
 *
 * Karar verme mantığı:
 *   - Her iki tarafın güven skoru
 *   - Oturum logları
 *   - Geçmiş uyuşmazlık geçmişi
 *   - İptal örüntüsü
 */
export async function resolveDisputeAutomatically(disputeId) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      session: {
        include: {
          teacher: true,
          learner: true,
          escrow: true,
          logs: true,
        },
      },
    },
  });

  if (!dispute) throw new Error('Uyuşmazlık bulunamadı');

  const { session } = dispute;
  const teacher = session.teacher;
  const learner = session.learner;

  // ── Karar Faktörleri ──────────────────────────────────────

  const factors = {
    teacherTrustScore: teacher.gorunmez_guven_skoru,
    learnerTrustScore: learner.gorunmez_guven_skoru,
    teacherCancellationRate: teacher.iptal_orani,
    learnerCancellationRate: learner.iptal_orani,
    sessionHasLogs: session.logs.length > 0,
    raisedByTeacher: dispute.raisedById === session.teacherId,
  };

  // ── Ağırlıklı Karar Algoritması ───────────────────────────
  let teacherScore = 0;
  let learnerScore = 0;

  // Güven skoru yüksek olan taraf lehine
  teacherScore += factors.teacherTrustScore * 40;
  learnerScore += factors.learnerTrustScore * 40;

  // İptal oranı yüksek olan aleyhine
  teacherScore -= factors.teacherCancellationRate * 20;
  learnerScore -= factors.learnerCancellationRate * 20;

  // Uyuşmazlığı kim açtı (karşı taraf kısmen suçlanır)
  if (factors.raisedByTeacher) {
    learnerScore -= 5; // Öğreten şikayet etti, öğrenen aleyhine hafif etki
  } else {
    teacherScore -= 5;
  }

  const total = teacherScore + learnerScore;
  const teacherWinProbability = total > 0 ? teacherScore / total : 0.5;
  const confidenceScore = Math.abs(teacherWinProbability - 0.5) * 2; // 0.0 - 1.0

  let decision;
  let escrowAction;

  if (teacherWinProbability >= 0.65) {
    // Öğreten lehine: kredi öğretene aktarılır
    decision = 'RESOLVED_TEACHER';
    escrowAction = 'release';
  } else if (teacherWinProbability <= 0.35) {
    // Öğrenen lehine: kredi iade edilir
    decision = 'RESOLVED_LEARNER';
    escrowAction = 'refund';
  } else {
    // Belirsiz: Manuel inceleme gerekiyor
    decision = null;
    escrowAction = null;
  }

  if (decision && confidenceScore >= 0.3) {
    // Otomatik çözüm uygula
    if (escrowAction === 'release') {
      // Escrow'u öğretene ver (özel fonksiyon)
      await prisma.$transaction(async (tx) => {
        await tx.escrow.update({
          where: { sessionId: session.id },
          data: {
            status: 'RELEASED',
            releasedAt: new Date(),
            releaseReason: 'dispute_resolved_teacher',
          },
        });
        await tx.user.update({
          where: { id: session.teacherId },
          data: { zaman_kredisi_bakiyesi: { increment: session.escrow.amount } },
        });
        await tx.session.update({
          where: { id: session.id },
          data: { status: 'COMPLETED' },
        });
      });

      await updateTrustScore(session.learnerId, 'dispute_lost', session.id);
      await updateTrustScore(session.teacherId, 'dispute_won', session.id);
    } else {
      await refundCredits(session.id, 'dispute_resolved_learner');
      await updateTrustScore(session.teacherId, 'dispute_lost', session.id);
      await updateTrustScore(session.learnerId, 'dispute_won', session.id);
    }

    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: decision,
        autoResolved: true,
        autoDecision: JSON.stringify({
          teacherWinProbability,
          factors,
          decision,
          escrowAction,
        }),
        confidenceScore,
        resolvedAt: new Date(),
      },
    });
  } else {
    // Manuel inceleme gerekiyor
    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'UNDER_REVIEW',
        autoDecision: JSON.stringify({
          reason: 'low_confidence',
          teacherWinProbability,
          confidenceScore,
          factors,
        }),
        confidenceScore,
      },
    });
  }

  return {
    disputeId,
    decision,
    confidenceScore,
    teacherWinProbability,
    requiresManualReview: !decision || confidenceScore < 0.3,
  };
}

// ============================================================
// İPTAL ZAMAN DAMGASI KONTROLÜ
// ============================================================

/**
 * Kullanıcı oturumu iptal ettiğinde güven skoru etkisini belirler.
 */
export async function handleCancellation(sessionId, cancelledById) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { escrow: true },
  });

  if (!session) throw new Error('Oturum bulunamadı');

  const now = new Date();
  const hoursUntilSession =
    (new Date(session.scheduledAt).getTime() - now.getTime()) / (1000 * 60 * 60);

  let trustEvent;
  if (hoursUntilSession < 24) {
    trustEvent = 'late_cancellation';
  } else {
    trustEvent = 'early_cancellation';
  }

  // İptal eden kişinin güven skorunu düşür
  await updateTrustScore(cancelledById, trustEvent, sessionId);

  // İptal oranını güncelle
  const userSessions = await prisma.session.count({
    where: {
      OR: [{ teacherId: cancelledById }, { learnerId: cancelledById }],
      status: { in: ['COMPLETED', 'CANCELLED'] },
    },
  });

  const cancelledSessions = await prisma.session.count({
    where: {
      OR: [{ teacherId: cancelledById }, { learnerId: cancelledById }],
      status: 'CANCELLED',
    },
  });

  await prisma.user.update({
    where: { id: cancelledById },
    data: {
      iptal_orani: userSessions > 0 ? cancelledSessions / userSessions : 0,
    },
  });

  // Escrow iade et
  if (session.escrow?.status === 'LOCKED') {
    await refundCredits(sessionId, `cancellation_by_${cancelledById === session.teacherId ? 'teacher' : 'learner'}`);
  }

  return { trustEvent, hoursUntilSession };
}
