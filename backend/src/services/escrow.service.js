/**
 * MODÜL B: Zaman Escrow Sistemi
 *
 * Güvenlik Kalkanı — Suistimal Önleme Mekanizması
 *
 * Akış:
 *   1. lockCredits()    → Oturum onaylandığında öğrenenin kredisi kilitlenir
 *   2. releaseCredits() → Oturum tamamlandığında öğretene aktarılır
 *   3. refundCredits()  → İptal/uyuşmazlık durumunda öğrenene iade edilir
 *
 * KRİTİK: Tüm işlemler Prisma transaction içinde atomik olarak çalışır.
 * Bu sayede kısmi işlem (partial update) riski sıfıra indirilir.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// KREDİ KİLİTLEME (LOCK)
// ============================================================

/**
 * Oturum onaylandığında öğrenenin kredisini kilitler.
 * Yeterli kredi yoksa işlemi reddeder.
 *
 * @param {string} sessionId
 * @returns {object} Escrow kaydı
 */
export async function lockCredits(sessionId) {
  return await prisma.$transaction(async (tx) => {
    // Oturumu ve tarafları getir
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: { learner: true },
    });

    if (!session) throw new Error('Oturum bulunamadı');
    if (session.status !== 'MATCHED') {
      throw new Error(`Escrow yalnızca MATCHED oturumlar için açılabilir. Mevcut durum: ${session.status}`);
    }

    // Mevcut escrow kontrolü
    const existingEscrow = await tx.escrow.findUnique({
      where: { sessionId },
    });
    if (existingEscrow) throw new Error('Bu oturum için zaten bir escrow mevcut');

    // Kredi yeterliliği kontrolü
    if (session.learner.zaman_kredisi_bakiyesi < session.creditAmount) {
      throw new Error(
        `Yetersiz kredi. Gereken: ${session.creditAmount}, Mevcut: ${session.learner.zaman_kredisi_bakiyesi}`
      );
    }

    // Öğrenenin bakiyesinden düş
    await tx.user.update({
      where: { id: session.learnerId },
      data: {
        zaman_kredisi_bakiyesi: {
          decrement: session.creditAmount,
        },
      },
    });

    // Escrow kaydı oluştur
    const escrow = await tx.escrow.create({
      data: {
        sessionId,
        holderId: session.learnerId,
        amount: session.creditAmount,
        status: 'LOCKED',
      },
    });

    // Oturum durumunu güncelle
    await tx.session.update({
      where: { id: sessionId },
      data: { status: 'CONFIRMED' },
    });

    // Log kaydı
    await tx.sessionLog.create({
      data: {
        sessionId,
        event: 'escrow_locked',
        actorId: session.learnerId,
        metadata: {
          amount: session.creditAmount,
          escrowId: escrow.id,
        },
      },
    });

    return escrow;
  });
}

// ============================================================
// KREDİ SERBEST BIRAKMA (RELEASE) — Öğretene Aktar
// ============================================================

/**
 * Oturum başarıyla tamamlandığında escrow'daki kredileri öğretene aktarır.
 * Her iki tarafın da tamamlama onayı gerekmektedir.
 *
 * @param {string} sessionId
 * @param {string} confirmingUserId - Tamamlamayı onaylayan kullanıcı
 * @returns {object} Güncellenen session
 */
export async function confirmCompletion(sessionId, confirmingUserId) {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: { escrow: true },
    });

    if (!session) throw new Error('Oturum bulunamadı');
    if (session.status !== 'ACTIVE' && session.status !== 'CONFIRMED') {
      throw new Error('Bu oturum tamamlanma onayı için uygun durumda değil');
    }

    const isTeacher = session.teacherId === confirmingUserId;
    const isLearner = session.learnerId === confirmingUserId;

    if (!isTeacher && !isLearner) {
      throw new Error('Bu oturum için onay verme yetkiniz yok');
    }

    // Onayı güncelle
    const updateData = {};
    if (isTeacher) updateData.teacherCompletionConfirmed = true;
    if (isLearner) updateData.learnerCompletionConfirmed = true;

    const updatedSession = await tx.session.update({
      where: { id: sessionId },
      data: updateData,
    });

    // Her iki taraf da onayladı mı?
    if (
      updatedSession.teacherCompletionConfirmed &&
      updatedSession.learnerCompletionConfirmed
    ) {
      await releaseCredits(sessionId, tx);
    }

    // Log
    await tx.sessionLog.create({
      data: {
        sessionId,
        event: 'completion_confirmed',
        actorId: confirmingUserId,
        metadata: { role: isTeacher ? 'teacher' : 'learner' },
      },
    });

    return updatedSession;
  });
}

/**
 * Escrow'daki kredileri öğretene aktarır.
 * SADECE iç kullanım — confirmCompletion veya otomatik hakemlik tarafından çağrılır.
 */
async function releaseCredits(sessionId, tx) {
  const session = await tx.session.findUnique({
    where: { id: sessionId },
    include: { escrow: true },
  });

  if (!session.escrow || session.escrow.status !== 'LOCKED') {
    throw new Error('Geçerli bir LOCKED escrow bulunamadı');
  }

  // Öğretene kredi ekle
  await tx.user.update({
    where: { id: session.teacherId },
    data: {
      zaman_kredisi_bakiyesi: { increment: session.escrow.amount },
      toplam_ogretim_saati: { increment: session.durationMinutes / 60 },
    },
  });

  // Öğrenenin toplam öğrenme saatini güncelle
  await tx.user.update({
    where: { id: session.learnerId },
    data: {
      toplam_ogrenme_saati: { increment: session.durationMinutes / 60 },
    },
  });

  // Escrow'u kapat
  await tx.escrow.update({
    where: { sessionId },
    data: {
      status: 'RELEASED',
      releasedAt: new Date(),
      releaseReason: 'completion_confirmed',
    },
  });

  // Oturumu tamamlandı olarak işaretle
  await tx.session.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      actualEndAt: new Date(),
    },
  });

  // Her iki tarafın tamamlama oranını güncelle
  await updateCompletionRate(session.teacherId, tx);
  await updateCompletionRate(session.learnerId, tx);

  // Log
  await tx.sessionLog.create({
    data: {
      sessionId,
      event: 'credits_released',
      metadata: {
        amount: session.escrow.amount,
        teacherId: session.teacherId,
      },
    },
  });
}

// ============================================================
// KREDİ İADESİ (REFUND) — Öğrenene Geri Aktar
// ============================================================

/**
 * İptal veya uyuşmazlık çözümünde öğrenenin kredisini iade eder.
 *
 * @param {string} sessionId
 * @param {string} reason - İade nedeni
 */
export async function refundCredits(sessionId, reason = 'cancellation') {
  return await prisma.$transaction(async (tx) => {
    const escrow = await tx.escrow.findUnique({
      where: { sessionId },
      include: { session: true },
    });

    if (!escrow) throw new Error('Escrow bulunamadı');
    if (escrow.status !== 'LOCKED') {
      throw new Error(`Escrow iade edilemez. Mevcut durum: ${escrow.status}`);
    }

    // Öğrenene iade et
    await tx.user.update({
      where: { id: escrow.holderId },
      data: {
        zaman_kredisi_bakiyesi: { increment: escrow.amount },
      },
    });

    // Escrow'u kapat
    await tx.escrow.update({
      where: { sessionId },
      data: {
        status: 'REFUNDED',
        releasedAt: new Date(),
        releaseReason: reason,
      },
    });

    // Oturumu iptal olarak işaretle
    await tx.session.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' },
    });

    // Log
    await tx.sessionLog.create({
      data: {
        sessionId,
        event: 'credits_refunded',
        metadata: { amount: escrow.amount, reason },
      },
    });

    return { refunded: escrow.amount, to: escrow.holderId };
  });
}

// ============================================================
// YARDIMCI: TAMAMLAMA ORANI GÜNCELLEME
// ============================================================

async function updateCompletionRate(userId, tx) {
  const sessions = await tx.session.findMany({
    where: {
      OR: [{ teacherId: userId }, { learnerId: userId }],
      status: { in: ['COMPLETED', 'CANCELLED'] },
    },
    select: { status: true },
  });

  if (sessions.length === 0) return;

  const completed = sessions.filter(s => s.status === 'COMPLETED').length;
  const rate = completed / sessions.length;

  await tx.user.update({
    where: { id: userId },
    data: { tamamlama_orani: rate },
  });
}
