import { useToastStore } from '../../hooks/useToast';

const TOAST_STYLES = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#6ee7b7', icon: '✓' },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  color: '#fca5a5', icon: '✕' },
  info:    { bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.35)',  color: '#67e8f9', icon: 'ℹ' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: '#fcd34d', icon: '⚠' },
};

export default function ToastContainer() {
  const { toasts, remove } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '8px',
      maxWidth: '360px', width: 'calc(100vw - 40px)',
    }}>
      {toasts.map(t => {
        const s = TOAST_STYLES[t.type] || TOAST_STYLES.info;
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            padding: '12px 14px',
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: 'var(--radius-md)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            animation: 'toastIn 0.25s var(--ease-spring)',
            cursor: 'pointer',
          }} onClick={() => remove(t.id)}>
            <span style={{ color: s.color, fontSize: '14px', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>
              {s.icon}
            </span>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: '1.45', flex: 1 }}>
              {t.message}
            </span>
            <button onClick={() => remove(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1,
              padding: '0', flexShrink: 0,
            }}>×</button>
          </div>
        );
      })}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
