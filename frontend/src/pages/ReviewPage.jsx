import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import api, { getErrorMessage } from '../utils/api';
import { toast } from '../hooks/useToast';

// ── Metrik Kartı ──────────────────────────────────────────────
function MetricCard({ label, desc, value, onChange, icon }) {
  return (
    <div style={{
      padding: '18px', borderRadius: 'var(--radius-md)',
      background: 'var(--surface-2)', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
        <span style={{ fontSize: '1.3rem' }}>{icon}</span>
        <div>
          <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '2px' }}>{label}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {[1, 2, 3, 4, 5].map(n => {
          const colors = { 1: '#ef4444', 2: '#f97316', 3: '#f59e0b', 4: '#06b6d4', 5: '#10b981' };
          const labels = { 1: 'Cok kotu', 2: 'Kotu', 3: 'Orta', 4: 'Iyi', 5: 'Mukemmel' };
          const isSelected = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              title={labels[n]}
              style={{
                flex: 1, height: '38px', borderRadius: 'var(--radius-md)',
                border: `2px solid ${isSelected ? colors[n] : 'var(--border)'}`,
                background: isSelected ? `${colors[n]}18` : 'var(--surface-3)',
                color: isSelected ? colors[n] : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'var(--font-display)',
                fontWeight: '700', fontSize: '0.9rem',
                transition: 'all 0.15s var(--ease-spring)',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      {value && (
        <div style={{
          marginTop: '8px', fontSize: '0.72rem', textAlign: 'center',
          color: ['', '#ef4444', '#f97316', '#f59e0b', '#06b6d4', '#10b981'][value],
          fontWeight: '500',
        }}>
          {['', 'Cok kotu', 'Kotu', 'Orta', 'Iyi', 'Mukemmel'][value]}
        </div>
      )}
    </div>
  );
}

// ── Evet/Hayır Kartı ──────────────────────────────────────────
function YesNoCard({ label, desc, icon, value, onChange }) {
  return (
    <div style={{
      padding: '16px', borderRadius: 'var(--radius-md)',
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {[true, false].map(v => (
          <button
            key={String(v)}
            onClick={() => onChange(v)}
            style={{
              padding: '7px 16px', borderRadius: 'var(--radius-full)',
              border: `1px solid ${value === v ? (v ? '#10b981' : '#ef4444') : 'var(--border)'}`,
              background: value === v ? (v ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)') : 'var(--surface-3)',
              color: value === v ? (v ? '#10b981' : '#ef4444') : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
              transition: 'all 0.15s',
            }}
          >
            {v ? 'Evet' : 'Hayir'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Gecikme Seçici ────────────────────────────────────────────
function LateSelector({ value, onChange }) {
  const options = [
    { label: 'Zamaninda', value: 0, color: '#10b981' },
    { label: '1-5 dk', value: 5, color: '#f59e0b' },
    { label: '6-15 dk', value: 10, color: '#f97316' },
    { label: '15+ dk', value: 20, color: '#ef4444' },
    { label: 'Hic gelmedi', value: 99, color: '#7f1d1d' },
  ];

  return (
    <div style={{
      padding: '18px', borderRadius: 'var(--radius-md)',
      background: 'var(--surface-2)', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ fontSize: '1.3rem' }}>⏰</span>
        <div>
          <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '2px' }}>Katilim Zamanlamasi</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Oturum baslangicina gore ne kadar gec geldi?</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, minWidth: '80px', padding: '9px 8px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${value === opt.value ? opt.color : 'var(--border)'}`,
              background: value === opt.value ? `${opt.color}15` : 'var(--surface-3)',
              color: value === opt.value ? opt.color : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────
export default function ReviewPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1); // 1: metrikler, 2: yorum

  const [form, setForm] = useState({
    zamanindaGeldiMi: null,       // bool
    gecikmeDakika: null,           // int
    iletisimKalitesi: null,        // 1-5
    konuHakimiyeti: null,          // 1-5
    anlatimNetligi: null,          // 1-5
    tekrarEslesirmekIster: null,   // bool
    comment: '',
    isAnonymous: false,
  });

  useEffect(() => {
    api.get(`/sessions/${sessionId}`)
      .then(r => {
        setSession(r.data);
        // Zaten değerlendirme yapıldıysa dashboard'a yönlendir
        const alreadyReviewed = r.data.reviews?.some(rv => rv.reviewerId === user?.id);
        if (alreadyReviewed) navigate('/dashboard');
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const isTeacher = session.teacherId === user?.id;
      const revieweeId = isTeacher ? session.learnerId : session.teacherId;

      await api.post('/reviews', {
        sessionId,
        revieweeId,
        zamanindaGeldiMi: form.gecikmeDakika === 0,
        gecikmeDakika: form.gecikmeDakika,
        iletisimKalitesi: form.iletisimKalitesi,
        konuHakimiyeti: form.konuHakimiyeti,
        anlatimNetligi: form.anlatimNetligi,
        tekrarEslesirmekIster: form.tekrarEslesirmekIster,
        comment: form.comment || null,
        isAnonymous: form.isAnonymous,
      });
      setSubmitted(true);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  // Adım 1'in tamamlanma kontrolü
  const step1Complete =
    form.gecikmeDakika !== null &&
    form.iletisimKalitesi !== null &&
    form.konuHakimiyeti !== null &&
    form.anlatimNetligi !== null &&
    form.tekrarEslesirmekIster !== null;

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid var(--surface-3)', borderTopColor: 'var(--purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (submitted) return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 50%, rgba(6,214,160,0.08) 0%, transparent 60%)',
    }}>
      <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem', margin: '0 auto 20px',
        }}>✓</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '8px' }}>
          Degerlendirme gonderildi!
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.875rem' }}>
          Geri bildiriminiz platformun kalitesini artiriyor.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Dashboard'a Don →
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!session) return null;

  const isTeacher = session.teacherId === user?.id;
  const reviewee = isTeacher ? session.learner : session.teacher;
  const roleLabel = isTeacher ? 'Ogrenicini' : 'Ogreteninle';

  return (
    <div style={{
      minHeight: '100vh', padding: '32px 24px',
      background: 'radial-gradient(ellipse at 30% 20%, rgba(147,51,234,0.08) 0%, transparent 50%)',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* Başlık */}
        <div style={{ marginBottom: '28px' }}>
          <button onClick={() => navigate(`/sessions/${sessionId}`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ← Oturuma Don
          </button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '4px' }}>
            {roleLabel} Degerlendir
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Bu geri bildirim yalnizca sistem tarafindan kullanilir. Klasik yildiz sistemi degil, davranissal olcum.
          </p>
        </div>

        {/* Kişi kartı */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '16px 20px', borderRadius: 'var(--radius-lg)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          marginBottom: '24px',
        }}>
          <div style={{
            width: '50px', height: '50px', borderRadius: '50%',
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: '700',
          }}>{reviewee?.displayName?.[0]?.toUpperCase()}</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '1rem' }}>
              {reviewee?.displayName}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {new Date(session.scheduledAt).toLocaleDateString('tr-TR', { dateStyle: 'medium' })} · {session.durationMinutes} dakika
            </div>
          </div>
          {/* Adım göstergesi */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                width: s === step ? '24px' : '8px', height: '8px',
                borderRadius: '4px',
                background: s < step ? 'var(--cyan)' : s === step ? 'var(--grad-brand)' : 'var(--surface-3)',
                transition: 'all 0.3s var(--ease-spring)',
              }} />
            ))}
          </div>
        </div>

        {/* ── Adım 1: Davranışsal metrikler ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.3s ease' }}>

            <LateSelector
              value={form.gecikmeDakika}
              onChange={v => setForm(f => ({ ...f, gecikmeDakika: v }))}
            />

            <MetricCard
              icon="💬"
              label="Iletisim Kalitesi"
              desc="Soru-cevap akisi, anlasılabilirlik, sabir"
              value={form.iletisimKalitesi}
              onChange={v => setForm(f => ({ ...f, iletisimKalitesi: v }))}
            />

            <MetricCard
              icon="🧠"
              label="Konu Hakimiyeti"
              desc="Konuyu ne kadar iyi biliyor ve aktarabiliyor?"
              value={form.konuHakimiyeti}
              onChange={v => setForm(f => ({ ...f, konuHakimiyeti: v }))}
            />

            <MetricCard
              icon="🎯"
              label="Anlatim Netligi"
              desc="Aciklamalar anlasilir ve yapisal miydi?"
              value={form.anlatimNetligi}
              onChange={v => setForm(f => ({ ...f, anlatimNetligi: v }))}
            />

            <YesNoCard
              icon="🔄"
              label="Tekrar Eslesirmek Ister Misin?"
              desc="Bu kisiyle gelecekte yeniden calisir miydin?"
              value={form.tekrarEslesirmekIster}
              onChange={v => setForm(f => ({ ...f, tekrarEslesirmekIster: v }))}
            />

            <button
              className="btn btn-primary"
              onClick={() => setStep(2)}
              disabled={!step1Complete}
              style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
            >
              Devam Et →
            </button>
          </div>
        )}

        {/* ── Adım 2: Yorum ve gönder ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.3s ease' }}>

            {/* Özet */}
            <div style={{
              padding: '16px', borderRadius: 'var(--radius-md)',
              background: 'var(--surface)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Secimlerinizin Ozeti
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Katilim', value: form.gecikmeDakika === 0 ? 'Zamaninda' : form.gecikmeDakika === 99 ? 'Hic gelmedi' : `${form.gecikmeDakika}dk gec` },
                  { label: 'Iletisim', value: `${form.iletisimKalitesi}/5` },
                  { label: 'Konu Hakimiyeti', value: `${form.konuHakimiyeti}/5` },
                  { label: 'Anlatim', value: `${form.anlatimNetligi}/5` },
                  { label: 'Tekrar Eslesme', value: form.tekrarEslesirmekIster ? 'Evet' : 'Hayir' },
                  {
                    label: 'Ort. Skor',
                    value: `${(((form.iletisimKalitesi + form.konuHakimiyeti + form.anlatimNetligi) / 3)).toFixed(1)}/5`,
                  },
                ].map(item => (
                  <div key={item.label} style={{
                    padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-2)',
                  }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '3px' }}>{item.label}</div>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Yorum */}
            <div className="form-group">
              <label className="form-label">Yorum (Istege Bagli)</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Bu kisi hakkinda eklemek istedikleriniz... Bu yorum anonim kalabilir."
                value={form.comment}
                onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Anonim seçeneği */}
            <button
              onClick={() => setForm(f => ({ ...f, isAnonymous: !f.isAnonymous }))}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '14px 16px', borderRadius: 'var(--radius-md)',
                background: form.isAnonymous ? 'rgba(147,51,234,0.08)' : 'var(--surface-2)',
                border: `1px solid ${form.isAnonymous ? 'rgba(147,51,234,0.3)' : 'var(--border)'}`,
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <div style={{
                width: '20px', height: '20px', borderRadius: '6px',
                border: `2px solid ${form.isAnonymous ? 'var(--purple)' : 'var(--border)'}`,
                background: form.isAnonymous ? 'var(--purple)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}>
                {form.isAnonymous && <span style={{ color: 'white', fontSize: '12px', lineHeight: 1 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>Anonimce gonder</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Yorumunuz karsı tarafa anonim gorunur, sistem kim oldugunu bilir
                </div>
              </div>
            </button>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: 'center' }}>
                ← Geri
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ flex: 2, justifyContent: 'center' }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Gonderiliyor...
                  </span>
                ) : 'Degerlendirmeyi Gonder ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
