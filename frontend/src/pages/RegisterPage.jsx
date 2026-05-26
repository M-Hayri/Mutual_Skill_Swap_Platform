import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '', username: '', displayName: '', password: ''
  });
  const [step, setStep] = useState(1);
  const { register, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(form);
    if (result.success) navigate('/skills/wizard');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
      background: 'radial-gradient(ellipse at 80% 50%, rgba(6,214,160,0.10) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(147,51,234,0.10) 0%, transparent 50%)'
    }}>
      <div style={{ width: '100%', maxWidth: '440px', animation: 'fadeIn 0.5s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '12px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '44px', height: '44px',
              background: 'var(--grad-brand)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px'
            }}>⇄</div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '800' }}>Mutual</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            2 kredi başlangıç hediyesiyle başla 🎁
          </p>
        </div>

        <div className="card" style={{ padding: '36px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '6px' }}>
            Hesap oluştur
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '28px' }}>
            Bilgini paylaş, yenisini öğren — para yok
          </p>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)', padding: '12px 16px',
              marginBottom: '20px', color: '#f87171', fontSize: '0.875rem'
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Ad Soyad</label>
              <input className="form-input" type="text" placeholder="Muhammed Hayri"
                value={form.displayName}
                onChange={e => setForm({ ...form, displayName: e.target.value })}
                required />
            </div>
            <div className="form-group">
              <label className="form-label">Kullanıcı Adı</label>
              <input className="form-input" type="text" placeholder="mhayri_"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                required />
            </div>
            <div className="form-group">
              <label className="form-label">E-posta</label>
              <input className="form-input" type="email" placeholder="sen@örnek.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required />
            </div>
            <div className="form-group">
              <label className="form-label">Şifre</label>
              <input className="form-input" type="password" placeholder="En az 8 karakter"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                minLength={8} required />
            </div>

            <button type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
              disabled={isLoading}>
              {isLoading ? 'Hesap oluşturuluyor...' : 'Ücretsiz Başla →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Zaten hesabın var mı?{' '}
            <Link to="/login" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: '500' }}>
              Giriş yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
