import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import api, { getErrorMessage } from '../utils/api';
import { toast } from '../hooks/useToast';

const LEVEL_LABELS = { BEGINNER: 'Baslangic', INTERMEDIATE: 'Orta', ADVANCED: 'Ileri', EXPERT: 'Uzman' };
const LEVEL_COLORS = { BEGINNER: '#10b981', INTERMEDIATE: '#06b6d4', ADVANCED: '#8b5cf6', EXPERT: '#f59e0b' };
const DAYS = ['Paz', 'Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt'];
const TIMEZONES = ['Europe/Istanbul','Europe/London','Europe/Berlin','America/New_York','America/Los_Angeles','Asia/Tokyo'];

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', border: '1px solid var(--border)', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '800', color: color || 'var(--text-primary)', marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function SkillTag({ userSkill, isOwn, onRemove, isDeleting }) {
  const color = LEVEL_COLORS[userSkill.level] || 'var(--text-muted)';
  const isTeacher = userSkill.role === 'TEACHER';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '10px 14px', borderRadius: 'var(--radius-md)',
      background: isTeacher ? 'rgba(147,51,234,0.06)' : 'rgba(6,214,160,0.06)',
      border: '1px solid ' + (isTeacher ? 'rgba(147,51,234,0.15)' : 'rgba(6,214,160,0.15)'),
    }}>
      <span style={{ fontSize: '1rem' }}>{isTeacher ? '👨‍🏫' : '📚'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{userSkill.skill.name}</div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '3px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', padding: '1px 7px', background: color + '15', color, borderRadius: 'var(--radius-full)', border: '1px solid ' + color + '30' }}>
            {LEVEL_LABELS[userSkill.level]}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{userSkill.skill.category?.name}</span>
        </div>
      </div>
      {isOwn && (
        <button onClick={() => onRemove(userSkill.id)} disabled={isDeleting}
          style={{ background: 'none', border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', fontSize: '14px', padding: '2px', borderRadius: '4px', lineHeight: 1 }}
          title="Kaldir">{isDeleting ? '...' : '×'}</button>
      )}
    </div>
  );
}

function AvailabilityEditor({ availability, onChange }) {
  const toggle = (day, slot) => {
    const exists = availability.find(a => a.dayOfWeek === day && a.startTime === slot);
    if (exists) {
      onChange(availability.filter(a => !(a.dayOfWeek === day && a.startTime === slot)));
    } else {
      const h = parseInt(slot.split(':')[0]);
      const endTime = String(h + 1).padStart(2, '0') + ':00';
      onChange([...availability, { dayOfWeek: day, startTime: slot, endTime }]);
    }
  };
  const slots = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00','19:00','20:00','21:00'];
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '400px' }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 8px', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'left', width: '50px' }}>Saat</th>
              {DAYS.map(d => <th key={d} style={{ padding: '6px 4px', fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: '600' }}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => (
              <tr key={slot}>
                <td style={{ padding: '3px 8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{slot}</td>
                {DAYS.map((_, dayIdx) => {
                  const active = availability.some(a => a.dayOfWeek === dayIdx && a.startTime === slot);
                  return (
                    <td key={dayIdx} style={{ padding: '3px 4px', textAlign: 'center' }}>
                      <button onClick={() => toggle(dayIdx, slot)} style={{ width: '28px', height: '24px', borderRadius: '5px', border: '1px solid ' + (active ? 'var(--purple)' : 'var(--border)'), background: active ? 'var(--purple)' : 'var(--surface-3)', cursor: 'pointer', transition: 'all 0.12s' }} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>Mor = Musait. Secimler eslesme algoritmasini etkiler.</p>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: authUser, updateUser } = useAuthStore();
  const isOwn = authUser?.username === username;

  const [profile, setProfile] = useState(null);
  const [mySkills, setMySkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('beceriler');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '', timezone: 'Europe/Istanbul' });
  const [availability, setAvailability] = useState([]);

  useEffect(() => {
    const requests = [api.get('/users/profile/' + username)];
    if (isOwn) requests.push(api.get('/skills/my'));
    Promise.all(requests)
      .then(([profileRes, skillsRes]) => {
        setProfile(profileRes.data);
        setEditForm({ displayName: profileRes.data.displayName || '', bio: profileRes.data.bio || '', timezone: profileRes.data.timezone || 'Europe/Istanbul' });
        setAvailability(profileRes.data.availability || []);
        if (skillsRes) setMySkills(skillsRes.data);
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [username]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/users/me', { ...editForm, availability });
      setProfile(prev => ({ ...prev, ...data }));
      updateUser(data);
      setSaveSuccess(true);
      toast.success('Profil kaydedildi!');
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSkill = async (skillId) => {
    setDeletingId(skillId);
    try {
      await api.delete('/skills/my/' + skillId);
      setMySkills(prev => prev.filter(s => s.id !== skillId));
      toast.success('Beceri kaldirildi.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid var(--surface-3)', borderTopColor: 'var(--purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!profile) return null;

  const teacherSkills = (isOwn ? mySkills : profile.skills || []).filter(s => s.role === 'TEACHER');
  const learnerSkills = (isOwn ? mySkills : profile.skills || []).filter(s => s.role === 'LEARNER');
  const completionPct = Math.round((profile.tamamlama_orani || 0) * 100);

  const tabs = isOwn
    ? [{ id: 'beceriler', label: 'Beceriler' }, { id: 'istatistikler', label: 'Istatistikler' }, { id: 'duzenle', label: 'Profili Duzenle' }]
    : [{ id: 'beceriler', label: 'Beceriler' }, { id: 'istatistikler', label: 'Istatistikler' }];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ height: '160px', background: 'linear-gradient(135deg, rgba(147,51,234,0.25) 0%, rgba(6,214,160,0.15) 100%)', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: '20px', left: '24px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-full)', padding: '8px 16px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.825rem' }}>← Geri</button>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 clamp(12px, 3vw, 24px)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginTop: '-48px', marginBottom: '24px' }}>
          <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '700', border: '4px solid var(--bg)', flexShrink: 0, boxShadow: 'var(--shadow-glow-purple)' }}>
            {profile.displayName?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, paddingBottom: '8px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '2px' }}>{profile.displayName}</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '6px' }}>
              @{profile.username}
              {profile.timezone && <span style={{ marginLeft: '10px' }}>🌍 {profile.timezone.replace('/', ' / ')}</span>}
            </div>
            {profile.bio && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>{profile.bio}</p>}
          </div>
          {isOwn && <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('duzenle')} style={{ marginBottom: '8px', flexShrink: 0 }}>✎ Duzenle</button>}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <StatCard icon="👨‍🏫" label="Toplam Ogretim" value={(profile.toplam_ogretim_saati || 0).toFixed(1) + 's'} color="var(--purple-light)" />
          <StatCard icon="📚" label="Toplam Ogrenme" value={(profile.toplam_ogrenme_saati || 0).toFixed(1) + 's'} color="var(--cyan)" />
          <StatCard icon="✓" label="Tamamlama" value={'%' + completionPct} color={completionPct >= 80 ? '#10b981' : completionPct >= 50 ? '#f59e0b' : '#ef4444'} />
          <StatCard icon="✦" label="Beceri" value={(isOwn ? mySkills : profile.skills || []).length} sub={teacherSkills.length + ' ogret · ' + learnerSkills.length + ' oren'} />
        </div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: activeTab === tab.id ? '600' : '400', borderBottom: '2px solid ' + (activeTab === tab.id ? 'var(--purple)' : 'transparent'), marginBottom: '-1px', transition: 'all 0.15s' }}>{tab.label}</button>
          ))}
        </div>

        {activeTab === 'beceriler' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Ogretiyor <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '0.85rem' }}>({teacherSkills.length})</span></h2>
                {isOwn && <Link to="/skills/wizard" className="btn btn-ghost btn-sm">+ Ekle</Link>}
              </div>
              {teacherSkills.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
                  Henuz ogretecek beceri yok.
                  {isOwn && <><br/><Link to="/skills/wizard" style={{ color: 'var(--cyan)', fontSize: '0.825rem' }}>Hemen ekle →</Link></>}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                  {teacherSkills.map(s => <SkillTag key={s.id} userSkill={s} isOwn={isOwn} onRemove={handleRemoveSkill} isDeleting={deletingId === s.id} />)}
                </div>
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Ogreniyor <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '0.85rem' }}>({learnerSkills.length})</span></h2>
                {isOwn && <Link to="/skills/wizard" className="btn btn-ghost btn-sm">+ Ekle</Link>}
              </div>
              {learnerSkills.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>Henuz ogrenecek beceri yok.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                  {learnerSkills.map(s => <SkillTag key={s.id} userSkill={s} isOwn={isOwn} onRemove={handleRemoveSkill} isDeleting={deletingId === s.id} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'istatistikler' && (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Tamamlama Orani</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '1rem', color: completionPct >= 80 ? '#10b981' : completionPct >= 50 ? '#f59e0b' : '#ef4444' }}>%{completionPct}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '4px', width: completionPct + '%', background: completionPct >= 80 ? 'linear-gradient(90deg, #10b981, #059669)' : completionPct >= 50 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #ef4444, #dc2626)', transition: 'width 0.8s var(--ease-smooth)' }} />
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.3rem' }}>📅</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>Uyelik Tarihi</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(profile.createdAt).toLocaleDateString('tr-TR', { dateStyle: 'long' })}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'duzenle' && isOwn && (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
            <div style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '16px' }}>Temel Bilgiler</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Gorunen Ad</label>
                  <input className="form-input" value={editForm.displayName} onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Adiniz Soyadiniz" />
                </div>
                <div className="form-group">
                  <label className="form-label">Hakkimda</label>
                  <textarea className="form-textarea" rows={3} value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder="Kendinizi kisaca tanitin..." style={{ resize: 'vertical' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Saat Dilimi</label>
                  <select className="form-select" value={editForm.timezone} onChange={e => setEditForm(f => ({ ...f, timezone: e.target.value }))}>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace('/', ' / ')}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '6px' }}>Musaitlik Takvimi</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Hangi gun ve saatlerde musaitsiniz?</p>
              <AvailabilityEditor availability={availability} onChange={setAvailability} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                {saving ? 'Kaydediliyor...' : 'Degisiklikleri Kaydet'}
              </button>
              {saveSuccess && <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: '500' }}>✓ Kaydedildi!</span>}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
