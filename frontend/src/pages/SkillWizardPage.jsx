import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../utils/api';
import { toast } from '../hooks/useToast';

const LEVELS = [
  { value: 'BEGINNER', label: 'Başlangıç', desc: 'Temelleri biliyorum', icon: '🌱' },
  { value: 'INTERMEDIATE', label: 'Orta', desc: 'Bağımsız çalışabilirim', icon: '🌿' },
  { value: 'ADVANCED', label: 'İleri', desc: 'Karmaşık konuları biliyorum', icon: '🌳' },
  { value: 'EXPERT', label: 'Uzman', desc: 'Profesyonel seviye', icon: '🏆' },
];

const FORMATS = [
  { value: 'online', label: 'Online', icon: '💻' },
  { value: 'yüz yüze', label: 'Yüz Yüze', icon: '🤝' },
  { value: 'her ikisi', label: 'Her İkisi', icon: '✦' },
];

function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i < current ? '24px' : '8px',
          height: '8px',
          borderRadius: '4px',
          background: i < current ? 'var(--grad-brand)' : 'var(--surface-3)',
          transition: 'all 0.3s var(--ease-spring)',
        }} />
      ))}
    </div>
  );
}

export default function SkillWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null); // 'TEACHER' | 'LEARNER'
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    skillId: null,
    skillName: '',
    categoryId: '',
    level: '',
    sessionDurationMinutes: 60,
    teachingFormat: 'online',
    description: '',
    currentLevel: '',
    targetLevel: '',
    learningGoal: '',
  });
  const [savedSkills, setSavedSkills] = useState([]);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/skills/categories').then(r => setCategories(r.data));
    api.get('/skills/my').then(r => setSavedSkills(r.data));
  }, []);

  const searchSkills = async (q) => {
    if (q.length < 2) return;
    const r = await api.get(`/skills/search?q=${q}`);
    setSkills(r.data);
  };

  const handleSubmit = async () => {
    const effectiveLevel = role === 'TEACHER' ? form.level : (form.currentLevel || 'BEGINNER');
    if (!form.skillId || !effectiveLevel || !role) return;
    setLoading(true);
    try {
      await api.post('/skills/my', {
        skillId: form.skillId,
        role,
        level: effectiveLevel,
        sessionDurationMinutes: form.sessionDurationMinutes,
        teachingFormat: form.teachingFormat,
        description: form.description,
        currentLevel: form.currentLevel,
        targetLevel: form.targetLevel,
        learningGoal: form.learningGoal,
      });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '16px', animation: 'fadeIn 0.5s ease' }}>✅</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '8px' }}>Beceri eklendi!</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Dashboard'a yönlendiriliyorsun...</p>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(147,51,234,0.10) 0%, transparent 60%)'
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/dashboard')}
            className="btn btn-ghost btn-sm">← Geri</button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: '700' }}>
            {step === 1 ? 'Beceri Türü' : step === 2 ? 'Beceri Seç' : 'Detaylar'}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{step}/3</span>
        </div>

        <StepIndicator current={step} total={3} />

        <div className="card" style={{ padding: '36px' }}>
          {/* Adım 1: Rol Seç */}
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '8px' }}>
                Ne yapmak istiyorsun?
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '28px' }}>
                Öğretmek veya öğrenmek için beceri ekle
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { value: 'TEACHER', icon: '👨‍🏫', title: 'Öğreteceğim', desc: 'Bildiğin bir beceriyi paylaş, kredi kazan', color: 'var(--purple)' },
                  { value: 'LEARNER', icon: '📚', title: 'Öğreneceğim', desc: 'Öğrenmek istediğin beceriyi ekle, eşleşme bul', color: 'var(--cyan)' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => { setRole(opt.value); setStep(2); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '20px', borderRadius: 'var(--radius-lg)',
                      background: role === opt.value ? 'var(--surface-3)' : 'var(--surface-2)',
                      border: `1px solid ${role === opt.value ? opt.color : 'var(--border)'}`,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s',
                    }}>
                    <span style={{ fontSize: '2rem' }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', marginBottom: '4px' }}>{opt.title}</div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{opt.desc}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Adım 2: Beceri Seç */}
          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '8px' }}>
                Hangi beceri?
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '24px' }}>
                Ara veya listeden seç
              </p>

              <input className="form-input" placeholder="Beceri ara... (Python, Gitar, İngilizce)"
                onChange={e => searchSkills(e.target.value)}
                style={{ marginBottom: '16px' }} />

              {skills.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {skills.map(skill => (
                    <button key={skill.id} onClick={() => {
                      setForm(f => ({ ...f, skillId: skill.id, skillName: skill.name }));
                      setStep(3);
                    }} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', borderRadius: 'var(--radius-md)',
                      background: form.skillId === skill.id ? 'var(--surface-3)' : 'var(--surface-2)',
                      border: `1px solid ${form.skillId === skill.id ? 'var(--purple)' : 'var(--border)'}`,
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{skill.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{skill.category?.name}</div>
                      </div>
                      {form.skillId === skill.id && <span style={{ color: 'var(--cyan)' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}

              {skills.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '24px' }}>
                  Aramak için yazmaya başla
                </div>
              )}
            </div>
          )}

          {/* Adım 3: Detaylar */}
          {step === 3 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '4px' }}>
                {form.skillName}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '24px' }}>
                {role === 'TEACHER' ? 'Öğretim bilgilerini doldur' : 'Öğrenme hedefini belirt'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {role === 'TEACHER' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Seviyeniz</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {LEVELS.map(l => (
                          <button key={l.value} onClick={() => setForm(f => ({ ...f, level: l.value }))}
                            style={{
                              padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                              background: form.level === l.value ? 'var(--surface-3)' : 'var(--surface-2)',
                              border: `1px solid ${form.level === l.value ? 'var(--purple)' : 'var(--border)'}`,
                              textAlign: 'left', transition: 'all 0.15s',
                            }}>
                            <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{l.icon}</div>
                            <div style={{ fontSize: '0.825rem', fontWeight: '600' }}>{l.label}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Oturum Süresi (dk)</label>
                      <select className="form-select"
                        value={form.sessionDurationMinutes}
                        onChange={e => setForm(f => ({ ...f, sessionDurationMinutes: +e.target.value }))}>
                        <option value={30}>30 dakika (0.5 kredi)</option>
                        <option value={60}>60 dakika (1.0 kredi)</option>
                        <option value={90}>90 dakika (1.5 kredi)</option>
                        <option value={120}>120 dakika (2.0 kredi)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Format</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {FORMATS.map(f => (
                          <button key={f.value} onClick={() => setForm(fm => ({ ...fm, teachingFormat: f.value }))}
                            style={{
                              flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                              background: form.teachingFormat === f.value ? 'var(--surface-3)' : 'var(--surface-2)',
                              border: `1px solid ${form.teachingFormat === f.value ? 'var(--purple)' : 'var(--border)'}`,
                              fontSize: '0.8rem', transition: 'all 0.15s',
                            }}>
                            {f.icon} {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Kendinizi tanıtın (isteğe bağlı)</label>
                      <textarea className="form-textarea" rows={3}
                        placeholder="Bu beceriyi nasıl öğrettiğinizi, deneyiminizi anlatın..."
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        style={{ resize: 'vertical' }} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Şu anki seviyeniz</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {LEVELS.map(l => (
                          <button key={l.value} onClick={() => setForm(f => ({ ...f, currentLevel: l.value }))}
                            style={{
                              padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                              background: form.currentLevel === l.value ? 'var(--surface-3)' : 'var(--surface-2)',
                              border: `1px solid ${form.currentLevel === l.value ? 'var(--cyan)' : 'var(--border)'}`,
                              textAlign: 'left',
                            }}>
                            <div style={{ fontSize: '1rem', marginBottom: '2px' }}>{l.icon}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{l.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Hedef seviyeniz</label>
                      <select className="form-select"
                        value={form.targetLevel}
                        onChange={e => setForm(f => ({ ...f, targetLevel: e.target.value }))}>
                        <option value="">Seçin</option>
                        {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Neden öğrenmek istiyorsunuz?</label>
                      <textarea className="form-textarea" rows={3}
                        placeholder="Hedeflerinizi, ne amaçla öğreneceğinizi yazın..."
                        value={form.learningGoal}
                        onChange={e => setForm(f => ({ ...f, learningGoal: e.target.value }))}
                        style={{ resize: 'vertical' }} />
                    </div>
                  </>
                )}

                <button className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleSubmit}
                  disabled={loading || !form.level && role === 'TEACHER' || !form.currentLevel && role === 'LEARNER'}>
                  {loading ? 'Kaydediliyor...' : `✦ Beceriyi Ekle`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
