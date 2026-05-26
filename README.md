# Mutual Learn by Exchange — MVP Kurulum Kılavuzu

## Tech Stack
- **Backend**: Node.js + Express + Prisma ORM + PostgreSQL + Socket.io
- **Frontend**: React 18 + Vite + Zustand + CSS Variables

---

## 🚀 Kurulum

### 1. Gereksinimler
- Node.js 18+
- PostgreSQL 14+

### 2. Backend Kurulumu

```bash
cd backend
cp .env.example .env
# .env dosyasını düzenle: DATABASE_URL ve JWT_SECRET

npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
# → http://localhost:3001
```

### 3. Frontend Kurulumu

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 📁 Klasör Yapısı

```
mutual-learn/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    ← Veritabanı şeması (9 tablo)
│   │   └── seed.js          ← Örnek veriler
│   └── src/
│       ├── controllers/     ← HTTP handler'lar
│       ├── services/
│       │   ├── matchmaking.service.js  ← Modül A: Akıllı Eşleştirme
│       │   ├── escrow.service.js       ← Modül B: Zaman Escrow
│       │   └── trust.service.js        ← Modül C: Güven Skoru + Hakemlik
│       ├── routes/          ← API rotaları
│       ├── middleware/      ← Auth + Error handling
│       └── socket/          ← Gerçek zamanlı iletişim
└── frontend/
    └── src/
        ├── pages/           ← Login, Register, Dashboard, Match, Session
        ├── store/           ← Zustand state management
        ├── utils/           ← Axios API client
        └── styles/          ← Global CSS + Design tokens
```

---

## 🗄️ Veritabanı Tabloları

| Tablo | Açıklama |
|-------|----------|
| `users` | Kullanıcılar, kredi bakiyesi, görünmez güven skoru |
| `skill_categories` | Programlama, Tasarım, Dil vb. |
| `skills` | Beceriler + zaman çarpanı |
| `user_skills` | Kullanıcı-beceri ilişkisi (öğreten/öğrenen) |
| `user_availability` | Müsaitlik takvimi |
| `sessions` | Eşleşme oturumları |
| `escrows` | Kredi kilitleme mekanizması |
| `reviews` | Çok boyutlu değerlendirme |
| `trust_score_logs` | Güven skoru geçmişi (audit trail) |
| `disputes` | Uyuşmazlık yönetimi |
| `session_logs` | Oturum audit trail |
| `notifications` | Bildirimler |

---

## 🔌 API Endpoints

```
POST /api/auth/register      → Kayıt
POST /api/auth/login         → Giriş
GET  /api/auth/me            → Profil

GET  /api/users/dashboard    → Dashboard verileri
GET  /api/users/profile/:un  → Kullanıcı profili

GET  /api/skills/categories  → Kategoriler
GET  /api/skills/search      → Beceri ara
GET  /api/skills/my          → Kendi becerilerim
POST /api/skills/my          → Beceri ekle

GET  /api/match/find/:skillId    → Eşleşme önerileri
POST /api/match/create           → Oturum oluştur

GET  /api/sessions               → Oturumlarım
POST /api/sessions/:id/confirm   → Onayla
POST /api/sessions/:id/complete  → Tamamla
POST /api/sessions/:id/cancel    → İptal et

POST /api/reviews                → Değerlendirme yaz
POST /api/disputes               → Uyuşmazlık aç
```

---

## 🔮 Aşama 2 Hazırlıkları (Mevcut Kodda)

- `swapCycleType` ve `swapCycleId` alanları: 3'lü takas döngüsü için
- `zaman_carpani`: Dinamik talep bazlı çarpan
- `talep_yogunlugu` ve `ortalama_zorluk`: Beceri ontolojisi için
- `gorunmez_guven_skoru` modüler yapısı: Gelişmiş ML skorlaması için

---

## 🧪 Demo Hesap

```
Email:    demo@mutual.learn
Şifre:    demo1234
Kredi:    5.0 saat
```
