import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import api, { getErrorMessage } from '../utils/api';
import { toast } from '../hooks/useToast';
import DateTimePicker from '../components/ui/DateTimePicker';

const LEVEL_LABELS = { BEGINNER: 'Baslangic', INTERMEDIATE: 'Orta', ADVANCED: 'Ileri', EXPERT: 'Uzman' };
const LEVEL_COLORS = { BEGINNER: '#10b981', INTERMEDIATE: '#06b6d4', ADVANCED: '#8b5cf6', EXPERT: '#f59e0b' };

// ── Kullanıcı Kartı ───────────────────────────────────────────
function UserCard({ user, onMatch, matchLoading }) {
  const teacherSkills = user.skills?.filter(s => s.role === 'TEACHER') || [];
  const learnerSkills = user.skills?.filter(s => s.role === 'LEARNER') || [];

  return (
    <div className="card" style={{ padding: '20px', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>

      {/* Üst kısım */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
        <Link to={`/profile/${user.username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: '700',
            transition: 'box-shadow 0.2s',
          }}>{user.displayName?.[0]?.toUpperCase()}</div>
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to={`/profile/${user.username}`} style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
              {user.displayName}
            </div>
          </Link>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{user.username}</div>
          {user.bio && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4',
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {user.bio}
            </div>
          )}
        </div>
        {/* İstatistikler */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1rem', color: 'var(--cyan)' }}>
            {(user.toplam_ogretim_saati || 0).toFixed(0)}s
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ogretim</div>
          <div style={{ marginTop: '4px', fontSize: '0.72rem', color: (user.tamamlama_orani || 0) >= 0.8 ? '#10b981' : 'var(--text-muted)', fontWeight: '600' }}>
            %{Math.round((user.tamamlama_orani || 0) * 100)}
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>tamamlama</div>
        </div>
      </div>

      {/* Öğretiyor */}
      {teacherSkills.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ogretiyor
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {teacherSkills.slice(0, 4).map(s => (
              <span key={s.id} style={{
                fontSize: '0.72rem', padding: '3px 10px',
                background: 'rgba(147,51,234,0.08)',
                color: 'var(--purple-light)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(147,51,234,0.15)',
              }}>
                {s.skill.name}
                <span style={{ marginLeft: '4px', opacity: 0.7 }}>· {LEVEL_LABELS[s.level]}</span>
              </span>
            ))}
            {teacherSkills.length > 4 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '3px 6px' }}>
                +{teacherSkills.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Öğreniyor */}
      {learnerSkills.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ogrenmek Istiyor
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {learnerSkills.slice(0, 3).map(s => (
              <span key={s.id} style={{
                fontSize: '0.72rem', padding: '3px 10px',
                background: 'rgba(6,214,160,0.06)',
                color: 'var(--cyan)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(6,214,160,0.15)',
              }}>{s.skill.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Alt buton */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <Link to={`/profile/${user.username}`}
          className="btn btn-ghost btn-sm"
          style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          Profili Gor
        </Link>
        {teacherSkills.length > 0 && (
          <button className="btn btn-primary btn-sm"
            onClick={() => onMatch(user)}
            disabled={matchLoading === user.id}
            style={{ flex: 2, justifyContent: 'center' }}>
            {matchLoading === user.id ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Yukleniyor...
              </span>
            ) : '⇄ Eslestir'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Skill Satırı (arama önerisi) ──────────────────────────────
function SkillSuggestion({ skill, onClick }) {
  return (
    <button onClick={() => onClick(skill)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 14px', width: '100%', textAlign: 'left',
        background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.12s',
        color: 'var(--text-primary)',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      <span style={{
        width: '32px', height: '32px', borderRadius: '8px',
        background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', flexShrink: 0,
      }}>✦</span>
      <div>
        <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{skill.name}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{skill.category?.name}</div>
      </div>
      <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ogretenleri goster →</span>
    </button>
  );
}

// ── Eşleştirme Modalı ─────────────────────────────────────────
function QuickMatchModal({ targetUser, myLearnerSkills, onClose, onConfirm }) {
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);

  const teachableByTarget = targetUser.skills?.filter(s => s.role === 'TEACHER') || [];
  const matchableSkills = teachableByTarget.filter(ts =>
    myLearnerSkills.some(ms => ms.skillId === ts.skillId)
  );
  const allOptions = matchableSkills.length > 0 ? matchableSkills : teachableByTarget;

  const handleConfirm = async () => {
    if (!selectedSkillId || !schedule) return;
    setCreating(true);
    await onConfirm(targetUser.id, selectedSkillId, schedule);
    setCreating(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: '520px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: '28px',
        maxHeight: '90vh', overflowY: 'auto',
        animation: 'fadeIn 0.25s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
            {targetUser.displayName} ile Eslestir
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '22px' }}>×</button>
        </div>

        {/* Adım göstergesi */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {[1,2].map(s => (
            <div key={s} style={{ height: '3px', flex: 1, borderRadius: '2px', background: s <= step ? 'var(--grad-brand)' : 'var(--surface-3)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              {matchableSkills.length > 0
                ? 'Karsilikli takas yapabilecegimiz beceriler:'
                : 'Bu kisi hangi beceriyi ogretsin?'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {allOptions.map(s => (
                <button key={s.skillId || s.id}
                  onClick={() => setSelectedSkillId(s.skillId || s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px', borderRadius: 'var(--radius-md)',
                    background: selectedSkillId === (s.skillId || s.id) ? 'var(--surface-3)' : 'var(--surface-2)',
                    border: `1px solid ${selectedSkillId === (s.skillId || s.id) ? 'var(--purple)' : 'var(--border)'}`,
                    cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
                  }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{s.skill?.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {LEVEL_LABELS[s.level]} seviye
                      {matchableSkills.some(ms => (ms.skillId || ms.id) === (s.skillId || s.id)) && (
                        <span style={{ marginLeft: '6px', color: 'var(--cyan)' }}>⇄ Karsilikli takas</span>
                      )}
                    </div>
                  </div>
                  {selectedSkillId === (s.skillId || s.id) && (
                    <span style={{ color: 'var(--cyan)', fontSize: '16px' }}>✓</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Vazgec</button>
              <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!selectedSkillId} style={{ flex: 2, justifyContent: 'center' }}>
                Tarih Sec →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <DateTimePicker
              value={schedule}
              onChange={setSchedule}
              teacherAvailability={targetUser.availability || []}
              zaman_carpani={1.0}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: 'center' }}>← Geri</button>
              <button className="btn btn-primary" onClick={handleConfirm}
                disabled={!schedule?.scheduledAt || creating}
                style={{ flex: 2, justifyContent: 'center' }}>
                {creating ? 'Olusturuluyor...' : 'Oturumu Olustur ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────
export default function ExplorePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('skill'); // 'skill' | 'user'
  const [results, setResults] = useState([]);
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [onlySwap, setOnlySwap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [matchModal, setMatchModal] = useState(null);
  const [matchLoading, setMatchLoading] = useState(null);
  const [mySkills, setMySkills] = useState([]);
  const inputRef = useRef(null);
  const suggestRef = useRef(null);

  useEffect(() => {
    api.get('/skills/categories').then(r => setCategories(r.data));
    api.get('/skills/my').then(r => setMySkills(r.data));
  }, []);

  // Beceri önerisi debounce
  useEffect(() => {
    if (mode !== 'skill' || query.length < 2) { setSkillSuggestions([]); return; }
    const t = setTimeout(() => {
      api.get(`/skills/search?q=${encodeURIComponent(query)}${selectedCategory ? `&categoryId=${selectedCategory}` : ''}`)
        .then(r => { setSkillSuggestions(r.data); setShowSuggestions(true); });
    }, 250);
    return () => clearTimeout(t);
  }, [query, mode, selectedCategory]);

  // Kullanıcı bazlı arama debounce
  useEffect(() => {
    if (mode !== 'user' || query.length < 2) { if (mode === 'user' && query.length < 2) setResults([]); return; }
    const t = setTimeout(() => doSearch(), 400);
    return () => clearTimeout(t);
  }, [query, mode]);

  const doSearch = useCallback(async (skillId = null) => {
    setLoading(true);
    setSearched(true);
    setShowSuggestions(false);
    try {
      if (mode === 'skill' && skillId) {
        const { data } = await api.get(`/match/find/${skillId}`);
        setResults((data.matches || []).map(m => ({
          ...m.candidate,
          matchScore: m.totalScore,
          matchBreakdown: m.breakdown,
          isDirectSwap: m.isDirectSwap,
        })));
      } else if (mode === 'user') {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [mode, query]);

  const handleSkillSelect = (skill) => {
    setQuery(skill.name);
    setShowSuggestions(false);
    doSearch(skill.id);
  };

  const handleMatch = async (targetUser) => {
    setMatchLoading(targetUser.id);
    try {
      // Kullanıcının tam profilini çek (availability dahil)
      const { data } = await api.get(`/users/profile/${targetUser.username}`);
      setMatchModal({ ...data, skills: targetUser.skills || data.skills });
    } catch (e) {
      toast.error('Kullanici profili yuklenemedi');
    } finally {
      setMatchLoading(null);
    }
  };

  const handleConfirmMatch = async (teacherId, skillId, schedule) => {
    try {
      const { data } = await api.post('/match/create', {
        teacherId,
        skillId,
        scheduledAt: schedule.scheduledAt,
        durationMinutes: schedule.durationMinutes,
      });
      setMatchModal(null);
      navigate(`/sessions/${data.session.id}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const myLearnerSkills = mySkills.filter(s => s.role === 'LEARNER');

  const filteredResults = results.filter(u => {
    if (selectedLevel) {
      const hasLevel = u.skills?.some(s => s.role === 'TEACHER' && s.level === selectedLevel);
      if (!hasLevel) return false;
    }
    if (onlySwap) {
      const canSwap = u.skills?.some(s =>
        s.role === 'LEARNER' && mySkills.some(ms => ms.role === 'TEACHER' && ms.skillId === s.skillId)
      );
      if (!canSwap) return false;
    }
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── Hero arama alanı ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(147,51,234,0.12) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '40px 24px 32px',
      }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => navigate('/dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px', padding: '4px' }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>Kesfet</h1>
          </div>

          {/* Mod seçimi */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'var(--surface-2)', padding: '4px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', width: 'fit-content' }}>
            {[
              { id: 'skill', label: '✦ Beceri Ara' },
              { id: 'user', label: '◉ Kullanici Ara' },
            ].map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setQuery(''); setResults([]); setSearched(false); }}
                style={{
                  padding: '8px 20px', borderRadius: 'var(--radius-full)',
                  border: 'none', cursor: 'pointer', fontSize: '0.825rem', fontWeight: '600',
                  background: mode === m.id ? 'var(--grad-brand)' : 'transparent',
                  color: mode === m.id ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}>{m.label}</button>
            ))}
          </div>

          {/* Arama kutusu */}
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '4px 4px 4px 18px',
              boxShadow: 'var(--shadow-md)',
              transition: 'border-color 0.2s',
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '18px', flexShrink: 0 }}>🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => skillSuggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={e => e.key === 'Enter' && mode === 'user' && doSearch()}
                placeholder={mode === 'skill' ? 'Python, Gitar, Ingilizce...' : 'Isim veya kullanici adi ara...'}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                }}
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]); setSearched(false); setSkillSuggestions([]); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', padding: '4px' }}>×</button>
              )}
              {mode === 'user' && (
                <button className="btn btn-primary btn-sm" onClick={() => doSearch()} style={{ borderRadius: '10px', flexShrink: 0 }}>
                  Ara
                </button>
              )}
            </div>

            {/* Autocomplete önerileri */}
            {showSuggestions && skillSuggestions.length > 0 && (
              <div ref={suggestRef} style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', marginTop: '4px',
                boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
              }}>
                {skillSuggestions.slice(0, 6).map(skill => (
                  <SkillSuggestion key={skill.id} skill={skill} onClick={handleSkillSelect} />
                ))}
              </div>
            )}
          </div>

          {/* Filtreler */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '6px 14px', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}>
              <option value="">Tum Kategoriler</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '6px 14px', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}>
              <option value="">Tum Seviyeler</option>
              {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <button onClick={() => setOnlySwap(v => !v)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                background: onlySwap ? 'rgba(6,214,160,0.12)' : 'var(--surface-2)',
                border: `1px solid ${onlySwap ? 'rgba(6,214,160,0.3)' : 'var(--border)'}`,
                color: onlySwap ? 'var(--cyan)' : 'var(--text-secondary)',
                fontSize: '0.8rem', fontWeight: onlySwap ? '600' : '400', transition: 'all 0.15s',
              }}>
              ⇄ Karsilikli Takas
            </button>
          </div>
        </div>
      </div>

      {/* ── Sonuçlar ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 24px' }}>

        {!searched && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🔍</div>
            <p style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Ogrenmeye basla
            </p>
            <p style={{ fontSize: '0.875rem' }}>
              {mode === 'skill' ? 'Bir beceri adi yaz, seni ogretebilecek kisiler ciksin.' : 'Bir kullanici adi veya isim ara.'}
            </p>

            {/* Kategori hızlı erişim */}
            {mode === 'skill' && categories.length > 0 && (
              <div style={{ marginTop: '28px' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Kategoriye Gore Goz At</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {categories.map(cat => (
                    <button key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); inputRef.current?.focus(); }}
                      style={{
                        padding: '8px 16px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                        background: selectedCategory === cat.id ? 'rgba(147,51,234,0.12)' : 'var(--surface-2)',
                        border: `1px solid ${selectedCategory === cat.id ? 'rgba(147,51,234,0.3)' : 'var(--border)'}`,
                        color: selectedCategory === cat.id ? 'var(--purple-light)' : 'var(--text-secondary)',
                        fontSize: '0.825rem', transition: 'all 0.15s',
                      }}>
                      {cat.name}
                      <span style={{ marginLeft: '6px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        ({cat._count?.skills || 0})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid var(--surface-3)', borderTopColor: 'var(--purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Aranıyor...
          </div>
        )}

        {!loading && searched && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '1rem' }}>
                  {filteredResults.length} sonuc
                </span>
                {query && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: '8px' }}>
                    "{query}" icin
                  </span>
                )}
              </div>
            </div>

            {filteredResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🤷</div>
                <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Sonuc bulunamadi.</p>
                <p style={{ fontSize: '0.8rem' }}>Filtrelerinizi degistirmeyi deneyin.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {filteredResults.map(u => (
                  <UserCard key={u.id} user={u} onMatch={handleMatch} matchLoading={matchLoading} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Eşleştirme modalı */}
      {matchModal && (
        <QuickMatchModal
          targetUser={matchModal}
          myLearnerSkills={myLearnerSkills}
          onClose={() => setMatchModal(null)}
          onConfirm={handleConfirmMatch}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
