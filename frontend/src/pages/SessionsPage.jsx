import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import api, { getErrorMessage } from '../utils/api';
import { toast } from '../hooks/useToast';

const STATUS_CONFIG = {
  PENDING:   { label: 'Bekliyor',    color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',   icon: '⏳' },
  MATCHED:   { label: 'Eslesti',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)',   icon: '🔗' },
  CONFIRMED: { label: 'Onaylandi',   color: '#06b6d4', bg: 'rgba(6,182,212,0.10)',    icon: '✓'  },
  ACTIVE:    { label: 'Aktif',       color: '#10b981', bg: 'rgba(16,185,129,0.10)',   icon: '▶'  },
  COMPLETED: { label: 'Tamamlandi',  color: '#6ee7b7', bg: 'rgba(110,231,183,0.10)', icon: '🏁' },
  CANCELLED: { label: 'Iptal',       color: '#ef4444', bg: 'rgba(239,68,68,0.10)',    icon: '✕'  },
  DISPUTED:  { label: 'Uyusmazlik', color: '#f97316', bg: 'rgba(249,115,22,0.10)',   icon: '⚠'  },
};

const FILTER_STATUSES = [
  { value: '', label: 'Tumu' },
  { value: 'ACTIVE,CONFIRMED', label: 'Aktif' },
  { value: 'PENDING,MATCHED', label: 'Bekliyor' },
  { value: 'COMPLETED', label: 'Tamamlandi' },
  { value: 'CANCELLED,DISPUTED', label: 'Kapandi' },
];

// ── Oturum Kartı ──────────────────────────────────────────────
function SessionCard({ session, userId, onAction, actionLoading }) {
  const isTeacher = session.teacherId === userId;
  const other = isTeacher ? session.learner : session.teacher;
  const cfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.PENDING;
  const scheduledDate = new Date(session.scheduledAt);
  const isPast = scheduledDate < new Date();
  const isLoading = actionLoading === session.id;

  const formattedDate = scheduledDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = scheduledDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      display: 'flex', alignItems: 'center', gap: '16px',
      transition: 'border-color 0.2s, transform 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>

      {/* Tarih sütunu */}
      <div style={{
        width: '56px', flexShrink: 0, textAlign: 'center',
        padding: '8px', borderRadius: 'var(--radius-md)',
        background: isPast && session.status === 'COMPLETED'
          ? 'rgba(110,231,183,0.06)'
          : isPast ? 'var(--surface-2)' : 'rgba(147,51,234,0.06)',
        border: `1px solid ${isPast && session.status !== 'COMPLETED' ? 'var(--border)' : 'rgba(147,51,234,0.12)'}`,
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1.2rem', lineHeight: 1, color: isPast ? 'var(--text-muted)' : 'var(--text-primary)' }}>
          {scheduledDate.getDate()}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
          {scheduledDate.toLocaleDateString('tr-TR', { month: 'short' })}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1px' }}>
          {formattedTime}
        </div>
      </div>

      {/* Karşı taraf */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '50%',
          background: 'var(--grad-brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', fontWeight: '700',
        }}>{other?.displayName?.[0]?.toUpperCase()}</div>
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: '14px', height: '14px', borderRadius: '50%',
          background: cfg.bg, border: `1px solid ${cfg.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '7px',
        }}>{cfg.icon}</div>
      </div>

      {/* Bilgi */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{other?.displayName}</span>
          <span style={{
            fontSize: '0.65rem', padding: '2px 8px',
            background: isTeacher ? 'rgba(147,51,234,0.08)' : 'rgba(6,214,160,0.08)',
            color: isTeacher ? 'var(--purple-light)' : 'var(--cyan)',
            borderRadius: 'var(--radius-full)',
            border: `1px solid ${isTeacher ? 'rgba(147,51,234,0.15)' : 'rgba(6,214,160,0.15)'}`,
          }}>
            {isTeacher ? '👨‍🏫 Ogretiyor' : '📚 Ogreniyor'}
          </span>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {formattedDate} · {session.durationMinutes} dk ·{' '}
          <span style={{ color: 'var(--cyan)', fontWeight: '500' }}>{session.creditAmount?.toFixed(1)} kredi</span>
        </div>
        {/* Escrow durumu */}
        {session.escrow && (
          <div style={{ fontSize: '0.68rem', color: session.escrow.status === 'LOCKED' ? '#fbbf24' : 'var(--text-muted)', marginTop: '2px' }}>
            🔒 {session.escrow.status === 'LOCKED' ? 'Kredi kilitli' : session.escrow.status === 'RELEASED' ? 'Kredi aktarildi' : 'Kredi iade edildi'}
          </div>
        )}
      </div>

      {/* Durum badge */}
      <span style={{
        fontSize: '0.72rem', padding: '4px 10px', flexShrink: 0,
        background: cfg.bg, color: cfg.color,
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${cfg.color}35`,
        fontWeight: '600',
      }}>{cfg.label}</span>

      {/* Aksiyonlar */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <Link to={`/sessions/${session.id}`}
          className="btn btn-ghost btn-sm"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          Ac
        </Link>

        {session.status === 'MATCHED' && (
          <button className="btn btn-primary btn-sm"
            onClick={() => onAction(session.id, 'confirm')} disabled={isLoading}>
            {isLoading ? '...' : 'Onayla'}
          </button>
        )}
        {session.status === 'ACTIVE' && (
          <button className="btn btn-primary btn-sm"
            onClick={() => onAction(session.id, 'complete')} disabled={isLoading}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            {isLoading ? '...' : 'Tamam'}
          </button>
        )}
        {session.status === 'COMPLETED' && (
          <Link to={`/sessions/${session.id}/review`}
            className="btn btn-ghost btn-sm"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', color: 'var(--cyan)', borderColor: 'rgba(6,214,160,0.3)' }}>
            ★ Degerlendir
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Özet İstatistik ───────────────────────────────────────────
function SummaryBar({ sessions }) {
  const total = sessions.length;
  const completed = sessions.filter(s => s.status === 'COMPLETED').length;
  const active = sessions.filter(s => ['ACTIVE','CONFIRMED'].includes(s.status)).length;
  const pending = sessions.filter(s => ['PENDING','MATCHED'].includes(s.status)).length;
  const cancelled = sessions.filter(s => ['CANCELLED','DISPUTED'].includes(s.status)).length;
  const totalHours = sessions
    .filter(s => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + (s.durationMinutes / 60), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '24px' }}>
      {[
        { label: 'Toplam', value: total, color: 'var(--text-primary)' },
        { label: 'Aktif', value: active, color: STATUS_CONFIG.ACTIVE.color },
        { label: 'Bekliyor', value: pending, color: STATUS_CONFIG.PENDING.color },
        { label: 'Tamamlandi', value: completed, color: STATUS_CONFIG.COMPLETED.color },
        { label: 'Toplam Saat', value: `${totalHours.toFixed(1)}s`, color: 'var(--cyan)' },
      ].map(s => (
        <div key={s.label} style={{
          padding: '14px', borderRadius: 'var(--radius-md)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1.3rem', color: s.color, marginBottom: '3px' }}>
            {s.value}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────
export default function SessionsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); // '' | 'teacher' | 'learner'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sessions', {
        params: { role: roleFilter || undefined },
      });
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleAction = async (sessionId, action) => {
    setActionLoading(sessionId);
    try {
      await api.post(`/sessions/${sessionId}/${action}`);
      await fetchSessions();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setActionLoading(null);
    }
  };

  // Filtrele + sırala
  const filtered = sessions
    .filter(s => {
      if (statusFilter) {
        const statuses = statusFilter.split(',');
        if (!statuses.includes(s.status)) return false;
      }
      if (searchQuery) {
        const other = s.teacherId === user?.id ? s.learner : s.teacher;
        if (!other?.displayName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.scheduledAt);
      const db = new Date(b.scheduledAt);
      return sortOrder === 'asc' ? da - db : db - da;
    });

  // Grupla: yaklaşan vs geçmiş
  const now = new Date();
  const upcoming = filtered.filter(s => new Date(s.scheduledAt) >= now && !['COMPLETED','CANCELLED','DISPUTED'].includes(s.status));
  const past = filtered.filter(s => new Date(s.scheduledAt) < now || ['COMPLETED','CANCELLED','DISPUTED'].includes(s.status));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: 'clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px) 0',
        background: 'linear-gradient(180deg, rgba(147,51,234,0.08) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
            <button onClick={() => navigate('/dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px', padding: '4px' }}>←</button>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '2px' }}>Oturumlarim</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                {sessions.length} oturum · {sessions.filter(s => s.status === 'COMPLETED').length} tamamlandi
              </p>
            </div>
            <button className="btn btn-primary btn-sm"
              onClick={() => navigate('/explore')}
              style={{ marginLeft: 'auto' }}>
              + Yeni Eslestir
            </button>
          </div>

          {/* Filtre barı */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '16px', alignItems: 'center' }}>
            {/* Durum filtreleri */}
            <div style={{ display: 'flex', gap: '2px', background: 'var(--surface-2)', padding: '3px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
              {FILTER_STATUSES.map(f => (
                <button key={f.value} onClick={() => setStatusFilter(f.value)}
                  style={{
                    padding: '6px 14px', borderRadius: 'var(--radius-full)', border: 'none',
                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: statusFilter === f.value ? '600' : '400',
                    background: statusFilter === f.value ? 'var(--grad-brand)' : 'transparent',
                    color: statusFilter === f.value ? 'white' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}>{f.label}</button>
              ))}
            </div>

            {/* Rol filtresi */}
            <div style={{ display: 'flex', gap: '2px', background: 'var(--surface-2)', padding: '3px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
              {[{ value: '', label: 'Her ikisi' }, { value: 'teacher', label: '👨‍🏫 Ogretiyor' }, { value: 'learner', label: '📚 Ogreniyor' }].map(r => (
                <button key={r.value} onClick={() => setRoleFilter(r.value)}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-full)', border: 'none',
                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: roleFilter === r.value ? '600' : '400',
                    background: roleFilter === r.value ? 'var(--surface-3)' : 'transparent',
                    color: roleFilter === r.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}>{r.label}</button>
              ))}
            </div>

            {/* Arama */}
            <div style={{ flex: 1, minWidth: '160px', position: 'relative' }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Kisi adi ara..."
                style={{
                  width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-full)', padding: '7px 14px',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.8rem',
                  outline: 'none',
                }} />
            </div>

            {/* Sıralama */}
            <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: '0.78rem', transition: 'all 0.15s',
              }}>
              {sortOrder === 'desc' ? '↓ En Yeni' : '↑ En Eski'}
            </button>
          </div>
        </div>
      </div>

      {/* İçerik */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px)' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid var(--surface-3)', borderTopColor: 'var(--purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Yukleniyor...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '14px' }}>📅</div>
            <p style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Henuz oturum yok
            </p>
            <p style={{ fontSize: '0.875rem', marginBottom: '20px' }}>Kesifet sayfasindan ilk eslesmeni olustur.</p>
            <button className="btn btn-primary" onClick={() => navigate('/explore')}>
              Kesfet →
            </button>
          </div>
        ) : (
          <>
            {/* Özet bar */}
            <SummaryBar sessions={sessions} />

            {/* Yaklaşan oturumlar */}
            {upcoming.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Yaklasan ({upcoming.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {upcoming.map(s => (
                    <SessionCard key={s.id} session={s} userId={user?.id} onAction={handleAction} actionLoading={actionLoading} />
                  ))}
                </div>
              </div>
            )}

            {/* Geçmiş / tamamlanan */}
            {past.length > 0 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Gecmis ({past.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {past.map(s => (
                    <SessionCard key={s.id} session={s} userId={user?.id} onAction={handleAction} actionLoading={actionLoading} />
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <p>Filtre sonucu bos. Filtreleri degistirin.</p>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
