import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Veritabani seed basliyor...');

  // Beceri Kategorileri — emoji yok (Windows PostgreSQL WIN1254 uyumu)
  const categories = await Promise.all([
    prisma.skillCategory.upsert({ where: { name: 'Programlama' }, update: {}, create: { name: 'Programlama', nameEn: 'Programming', icon: 'code' } }),
    prisma.skillCategory.upsert({ where: { name: 'Tasarim' }, update: {}, create: { name: 'Tasarim', nameEn: 'Design', icon: 'design' } }),
    prisma.skillCategory.upsert({ where: { name: 'Dil' }, update: {}, create: { name: 'Dil', nameEn: 'Language', icon: 'language' } }),
    prisma.skillCategory.upsert({ where: { name: 'Muzik' }, update: {}, create: { name: 'Muzik', nameEn: 'Music', icon: 'music' } }),
    prisma.skillCategory.upsert({ where: { name: 'Matematik' }, update: {}, create: { name: 'Matematik', nameEn: 'Mathematics', icon: 'math' } }),
    prisma.skillCategory.upsert({ where: { name: 'Finans' }, update: {}, create: { name: 'Finans', nameEn: 'Finance', icon: 'finance' } }),
    prisma.skillCategory.upsert({ where: { name: 'Spor' }, update: {}, create: { name: 'Spor', nameEn: 'Sports', icon: 'sports' } }),
    prisma.skillCategory.upsert({ where: { name: 'Fotografcilik' }, update: {}, create: { name: 'Fotografcilik', nameEn: 'Photography', icon: 'photo' } }),
  ]);

  const catMap = Object.fromEntries(categories.map(c => [c.name, c.id]));

  // Beceriler
  const skills = [
    { name: 'Python', categoryId: catMap['Programlama'], zaman_carpani: 1.2 },
    { name: 'JavaScript', categoryId: catMap['Programlama'], zaman_carpani: 1.1 },
    { name: 'React', categoryId: catMap['Programlama'], zaman_carpani: 1.3 },
    { name: 'UI/UX Tasarim', categoryId: catMap['Tasarim'], zaman_carpani: 1.2 },
    { name: 'Figma', categoryId: catMap['Tasarim'], zaman_carpani: 1.0 },
    { name: 'Ingilizce', categoryId: catMap['Dil'], zaman_carpani: 1.0 },
    { name: 'Almanca', categoryId: catMap['Dil'], zaman_carpani: 1.1 },
    { name: 'Gitar', categoryId: catMap['Muzik'], zaman_carpani: 1.0 },
    { name: 'Piyano', categoryId: catMap['Muzik'], zaman_carpani: 1.1 },
    { name: 'Veri Analizi', categoryId: catMap['Programlama'], zaman_carpani: 1.4 },
    { name: 'Excel', categoryId: catMap['Finans'], zaman_carpani: 0.9 },
    { name: 'Fotograf Duzenleme', categoryId: catMap['Fotografcilik'], zaman_carpani: 1.0 },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name_categoryId: { name: skill.name, categoryId: skill.categoryId } },
      update: {},
      create: { ...skill, isVerified: true },
    });
  }

  // Demo kullanici
  const hash = await bcrypt.hash('demo1234', 12);
  await prisma.user.upsert({
    where: { email: 'demo@mutual.learn' },
    update: {},
    create: {
      email: 'demo@mutual.learn',
      username: 'demo_user',
      passwordHash: hash,
      displayName: 'Demo Kullanici',
      bio: 'Bu platform icin olusturulmus demo hesap',
      zaman_kredisi_bakiyesi: 5.0,
      gorunmez_guven_skoru: 0.75,
    },
  });

  console.log('Seed tamamlandi!');
  console.log('  ' + categories.length + ' kategori');
  console.log('  ' + skills.length + ' beceri');
  console.log('  1 demo kullanici: demo@mutual.learn / demo1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
