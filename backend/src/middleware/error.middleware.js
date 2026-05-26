import { Prisma } from '@prisma/client';

export function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Prisma bilinen hata kodları
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const messages = {
      P2002: 'Bu kayit zaten mevcut.',
      P2025: 'Kayit bulunamadi.',
      P2003: 'Gecersiz referans ID.',
      P2014: 'Iliski kisitlamasi ihlali.',
    };
    return res.status(400).json({
      message: messages[err.code] || `Veritabani hatasi (${err.code})`,
    });
  }

  // Prisma validasyon hatası — enum/zorunlu alan
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      message: 'Gecersiz veri. Tum alanlari kontrol edin.',
    });
  }

  // Uygulama katmanı hataları
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({ message: err.message });
  }

  // Bilinmeyen hatalar
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    message: status >= 500 ? 'Sunucu hatasi. Lutfen tekrar deneyin.' : (err.message || 'Bir hata olustu.'),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}
