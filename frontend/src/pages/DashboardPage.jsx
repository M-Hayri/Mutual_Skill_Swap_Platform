import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import api, { getErrorMessage } from '../utils/api';
import { toast } from '../hooks/useToast';
import DateTimePicker from '../components/ui/DateTimePicker';



// ── Öğrenmek İstediğim Beceri Kartı ──────────────────────────
function LearnerSkillCard({ userSkill, onFindMatch, isSearching }) {
  const levelColors = { BEGINNER: '#10b981', INTERMEDIATE: '#06b6d4', ADVANCED: '#8b5cf6', EXPERT: '#f59e0b' };
  const levelLabels = { BEGINNER: 'Baslangic', INTERMEDIATE: 'Orta', ADVANCED: 'Ileri', EXPERT: 'Uzman' };

  return (
    <div style={{
      padding: '16px', borderRadius: 'var(--radius-md)',
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: '14px',
      transition: 'border-color 0.2s',
    }}>
      <div style={{
        width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
        background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.2rem', flexShrink: 0,
      }}>📚</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '3px' }}>
          {userSkill.skill.name}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.7rem', padding: '2px 8px',
            background: `${levelColors[userSkill.currentLevel] || '#6b7280'}15`,
            color: levelColors[userSkill.currentLevel] || 'var(--text-muted)',
            borderRadius: 'var(--radius-full)',
            border: `1px solid ${levelColors[userSkill.currentLevel] || '#6b7280'}30`,
          }}>
            {levelLabels[userSkill.currentLevel] || userSkill.level}
          </span>
          {userSkill.targetLevel && (
            <>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>→</span>
              <span style={{
                fontSize: '0.7rem', padding: '2px 8px',
                background: `${levelColors[userSkill.targetLevel]}15`,
                color: levelColors[userSkill.targetLevel],
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${levelColors[userSkill.targetLevel]}30`,
              }}>
                {levelLabels[userSkill.targetLevel]}
              </span>
            </>
          )}
        </div>
      </div>

      <button
        className="btn btn-primary btn-sm"
        onClick={() => onFindMatch(userSkill)}
        disabled={isSearching === userSkill.id}
        style={{ flexShrink: 0 }}
      >
        {isSearching === userSkill.id ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            Araniyor...
          </span>
        ) : '⇄ Eslestir'}
      </button>
    </div>
  );
}

// ── Öğrettiğim Beceri Kartı ───────────────────────────────────
function TeacherSkillCard({ userSkill }) {
  const levelLabels = { BEGINNER: 'Baslangic', INTERMEDIATE: 'Orta', ADVANCED: 'Ileri', EXPERT: 'Uzman' };
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 'var(--radius-md)',
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <div style={{
        width: '38px', height: '38px', borderRadius: 'var(--radius-md)',
        background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', flexShrink: 0,
      }}>👨‍🏫</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{userSkill.skill.name}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {levelLabels[userSkill.level]} · {userSkill.sessionDurationMinutes || 60} dk
        </div>
      </div>
      <span style={{
        fontSize: '0.7rem', padding: '3px 8px',
        background: 'rgba(147,51,234,0.1)', color: 'var(--purple-light)',
        borderRadius: 'var(--radius-full)',
      }}>Aktif</span>
    </div>
  );
}

// ── Eşleşme Sonuç Modalı — Takvim Entegreli ─────────────────
function MatchModal({ matches, skill, onClose, onConfirm }) {
  const [step, setStep] = useState(1); // 1: kisi sec, 2: tarih/saat
  const [selected, setSelected] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [creating, setCreating] = useState(false);

  const handleConfirm = async () => {
    if (!selected || !schedule) return;
    setCreating(true);
    await onConfirm(selected, skill, schedule);
    setCreating(false);
  };

  const canProceed = schedule?.scheduledAt && schedule?.durationMinutes;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: step === 2 ? '560px' : '520px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px',
        animation: 'fadeIn 0.25s ease',
        maxHeight: '90vh', overflowY: 'auto',
        transition: 'max-width 0.3s ease',
      }}>
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
            {step === 1 ? `${skill.name} icin Eslesmeler` : `Oturum Planla`}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>

        {/* Adım göstergesi */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {[1,2].map(s => (
            <div key={s} style={{
              height: '3px', flex: 1, borderRadius: '2px',
              background: s <= step ? 'var(--grad-brand)' : 'var(--surface-3)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* ── Adım 1: Kişi seç ── */}
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '16px' }}>
              Algoritma {matches.length} uygun ogretmen buldu.
            </p>

            {matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔍</div>
                <p>Su an uygun ogretmen bulunamadi.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>Daha fazla kullanici katildikca eslesme olasiligi artar.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {matches.map((match) => (
                    <button key={match.candidate.id} onClick={() => setSelected(match)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '14px 16px', borderRadius: 'var(--radius-md)',
                        background: selected?.candidate.id === match.candidate.id ? 'var(--surface-3)' : 'var(--surface-2)',
                        border: `1px solid ${selected?.candidate.id === match.candidate.id ? 'var(--purple)' : 'var(--border)'}`,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%',
                      }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '50%',
                        background: 'var(--grad-brand)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: '700',
                      }}>{match.candidate.displayName?.[0]?.toUpperCase()}</div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{match.candidate.displayName}</span>
                          {match.isDirectSwap && (
                            <span style={{ fontSize: '0.62rem', padding: '1px 7px', background: 'rgba(6,214,160,0.12)', color: 'var(--cyan)', borderRadius: 'var(--radius-full)', border: '1px solid rgba(6,214,160,0.25)', fontWeight: '600' }}>⇄ Karsılikli</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {Object.entries(match.breakdown).map(([key, val]) => {
                            const labels = { skillMatch: 'Beceri', levelMatch: 'Seviye', timeAvail: 'Zaman', swapBalance: 'Denge', trustScore: 'Guven' };
                            const color = val >= 70 ? 'var(--cyan)' : val >= 50 ? 'var(--purple-light)' : 'var(--text-muted)';
                            return (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{labels[key]}</span>
                                <div style={{ width: '32px', height: '3px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ width: `${val}%`, height: '100%', background: color, borderRadius: '2px' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1.05rem', flexShrink: 0, color: match.totalScore >= 0.7 ? 'var(--cyan)' : 'var(--purple-light)' }}>
                        {(match.totalScore * 100).toFixed(0)}%
                      </div>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Vazgec</button>
                  <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!selected} style={{ flex: 2, justifyContent: 'center' }}>
                    {selected ? `${selected.candidate.displayName} — Tarih Sec →` : 'Birini sec'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Adım 2: Tarih/saat seç ── */}
        {step === 2 && selected && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {/* Seçilen kişi özeti */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
                {selected.candidate.displayName?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{selected.candidate.displayName}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{skill.name} ogretmeni · %{(selected.totalScore * 100).toFixed(0)} uyum</div>
              </div>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Degistir</button>
            </div>

            <DateTimePicker
              value={schedule}
              onChange={setSchedule}
              teacherAvailability={selected.candidate.teacherAvailability || []}
              zaman_carpani={1.0}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: 'center' }}>← Geri</button>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={!canProceed || creating} style={{ flex: 2, justifyContent: 'center' }}>
                {creating ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Oturum olusturuluyor...
                  </span>
                ) : canProceed ? 'Oturumu Olustur ✓' : 'Tarih ve saat sec'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [mySkills, setMySkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(null); // skill id
  const [matchModal, setMatchModal] = useState(null); // { matches, skill }

  useEffect(() => {
    Promise.all([
      api.get('/users/dashboard'),
      api.get('/skills/my'),
    ]).then(([dashRes, skillsRes]) => {
      setDashboard(dashRes.data);
      setMySkills(skillsRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Eşleşme ara
  const handleFindMatch = async (userSkill) => {
    setSearching(userSkill.id);
    try {
      const { data } = await api.get(`/match/find/${userSkill.skillId}`);
      setMatchModal({ matches: data.matches || [], skill: userSkill.skill });
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSearching(null);
    }
  };

  // Eşleşmeyi onayla ve oturum oluştur
  const handleConfirmMatch = async (match, skill, schedule) => {
    try {
      const { data } = await api.post('/match/create', {
        teacherId: match.candidate.id,
        skillId: skill.id,
        scheduledAt: schedule.scheduledAt,
        durationMinutes: schedule.durationMinutes,
      });
      setMatchModal(null);
      navigate(`/sessions/${data.session.id}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid var(--surface-3)', borderTopColor: 'var(--purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Yukleniyor...
      </div>
    </div>
  );

  const d = dashboard || {};
  const currentUser = d.user || user;
  const teacherSkills = mySkills.filter(s => s.role === 'TEACHER');
  const learnerSkills = mySkills.filter(s => s.role === 'LEARNER');

  return (
    <div style={{ minHeight: '100vh' }}>
      <main style={{ padding: '24px 32px', overflow: 'auto' }}>
        {/* Başlık */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '4px' }}>
            Merhaba, <span className="gradient-text">{currentUser?.displayName?.split(' ')[0]}</span> 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Bugun ne ogreniyoruz?
          </p>
        </div>

        {/* İstatistikler */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { icon: '⏱', label: 'Kredi', value: `${(currentUser?.zaman_kredisi_bakiyesi || 0).toFixed(1)}s`, color: 'var(--cyan)' },
            { icon: '👨‍🏫', label: 'Ogrettim', value: `${(currentUser?.toplam_ogretim_saati || 0).toFixed(0)}s` },
            { icon: '📚', label: 'Ogrendim', value: `${(currentUser?.toplam_ogrenme_saati || 0).toFixed(0)}s` },
            { icon: '✦', label: 'Beceri', value: mySkills.length },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: '800', color: s.color || 'var(--text-primary)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

          {/* ── SOL: Öğrenmek istediklerim ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '2px' }}>
                  Ogreneceklerim
                </h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Butona tikla, anlinda eslesme bul
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/skills/wizard')}>
                + Ekle
              </button>
            </div>

            {learnerSkills.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📚</div>
                <p style={{ fontSize: '0.825rem', marginBottom: '12px' }}>Henuz ogrenecek beceri eklemedin.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/skills/wizard')}>
                  Beceri Ekle
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {learnerSkills.map(s => (
                  <LearnerSkillCard
                    key={s.id}
                    userSkill={s}
                    onFindMatch={handleFindMatch}
                    isSearching={searching}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── SAĞ: Öğrettiklerim + Yaklaşan ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Öğrettiklerim */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '2px' }}>
                    Ogrettiklerim
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Diger kullanicilara aktarabildigin beceriler
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/skills/wizard')}>
                  + Ekle
                </button>
              </div>

              {teacherSkills.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👨‍🏫</div>
                  <p style={{ fontSize: '0.825rem', marginBottom: '12px' }}>Henuz ogretecek beceri eklemedin.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/skills/wizard')}>
                    Beceri Ekle
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {teacherSkills.map(s => (
                    <TeacherSkillCard key={s.id} userSkill={s} />
                  ))}
                </div>
              )}
            </div>

            {/* Yaklaşan oturumlar */}
            {(d.upcomingSessions?.length > 0) && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Yaklasan Oturumlar</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {d.upcomingSessions.map(s => {
                    const isTeacher = s.teacherId === currentUser?.id;
                    const other = isTeacher ? s.learner : s.teacher;
                    const dt = new Date(s.scheduledAt);
                    return (
                      <Link key={s.id} to={`/sessions/${s.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px', borderRadius: 'var(--radius-md)',
                          background: 'var(--surface-2)', border: '1px solid var(--border)',
                          transition: 'border-color 0.15s',
                        }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'var(--grad-brand)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: '700', flexShrink: 0,
                          }}>{other?.displayName?.[0]?.toUpperCase()}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>{other?.displayName}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {isTeacher ? 'Ogretiyorsun' : 'Ogreniyorsun'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.78rem', color: 'var(--cyan)', fontWeight: '500' }}>
                              {dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Eşleşme Modalı */}
      {matchModal && (
        <MatchModal
          matches={matchModal.matches}
          skill={matchModal.skill}
          onClose={() => setMatchModal(null)}
          onConfirm={handleConfirmMatch}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
