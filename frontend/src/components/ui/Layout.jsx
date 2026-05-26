import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

const NAV_ITEMS = [
  { icon: '⊞', label: 'Ana Sayfa', path: '/dashboard' },
  { icon: '🔍', label: 'Kesfet', path: '/explore' },
  { icon: '◷', label: 'Oturumlar', path: '/sessions' },
  { icon: '✦', label: 'Beceri', path: '/skills/wizard' },
];

// ── Masaüstü Sidebar ──────────────────────────────────────────
function Sidebar({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside style={{
      width: '220px', flexShrink: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '20px 12px',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', padding: '0 8px' }}>
        <div style={{
          width: '32px', height: '32px', background: 'var(--grad-brand)',
          borderRadius: '9px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '15px', flexShrink: 0,
        }}>⇄</div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1rem' }}>Mutual</span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {[...NAV_ITEMS, { icon: '◉', label: 'Profilim', path: `/profile/${user?.username}` }].map(item => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link key={item.path} to={item.path} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--surface-3)' : 'transparent',
              fontSize: '0.85rem', fontWeight: isActive ? '600' : '400',
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '1rem', width: '18px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Kredi + kullanıcı */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(147,51,234,0.12), rgba(6,214,160,0.08))',
          border: '1px solid rgba(147,51,234,0.2)',
          borderRadius: 'var(--radius-md)', padding: '10px 12px',
        }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zaman Kredisi</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: '800', color: 'var(--cyan)' }}>
            {(user?.zaman_kredisi_bakiyesi || 0).toFixed(1)}
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>saat</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 4px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'var(--grad-brand)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0,
          }}>{user?.displayName?.[0]?.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.displayName}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@{user?.username}</div>
          </div>
          <button onClick={onLogout} title="Cikis" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', padding: '4px', borderRadius: '4px' }}>⎋</button>
        </div>
      </div>
    </aside>
  );
}

// ── Mobil Alt Nav ─────────────────────────────────────────────
function MobileNav({ user }) {
  const location = useLocation();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom, 0)',
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
        return (
          <Link key={item.path} to={item.path} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '10px 4px 8px',
            textDecoration: 'none',
            color: isActive ? 'var(--purple-light)' : 'var(--text-muted)',
            gap: '3px', minHeight: '56px',
          }}>
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: isActive ? '600' : '400', letterSpacing: '0.02em' }}>
              {item.label}
            </span>
            {isActive && (
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--purple)', position: 'absolute', bottom: '4px' }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// ── Mobil Header ──────────────────────────────────────────────
function MobileHeader({ user, onLogout }) {
  const navigate = useNavigate();
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '28px', height: '28px', background: 'var(--grad-brand)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>⇄</div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '0.95rem' }}>Mutual</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          padding: '5px 12px', borderRadius: 'var(--radius-full)',
          background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.2)',
          fontSize: '0.78rem', fontWeight: '700', color: 'var(--cyan)',
          fontFamily: 'var(--font-display)',
        }}>
          {(user?.zaman_kredisi_bakiyesi || 0).toFixed(1)}s
        </div>
        <button onClick={() => navigate(`/profile/${user?.username}`)} style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'var(--grad-brand)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: '700', color: 'white',
        }}>{user?.displayName?.[0]?.toUpperCase()}</button>
      </div>
    </header>
  );
}

// ── Ana Layout Bileşeni ───────────────────────────────────────
export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Masaüstü: sidebar + içerik */}
      <div className="desktop-layout" style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar user={user} onLogout={handleLogout} />
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          {children}
        </main>
      </div>

      {/* Mobil: header + içerik + alt nav */}
      <div className="mobile-layout" style={{ display: 'none', flexDirection: 'column', minHeight: '100vh' }}>
        <MobileHeader user={user} onLogout={handleLogout} />
        <main style={{ flex: 1, overflow: 'auto', paddingBottom: '72px' }}>
          {children}
        </main>
        <MobileNav user={user} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-layout { display: none !important; }
          .mobile-layout { display: flex !important; }
        }
        @media (min-width: 769px) {
          .desktop-layout { display: flex !important; }
          .mobile-layout { display: none !important; }
        }
      `}</style>
    </>
  );
}
