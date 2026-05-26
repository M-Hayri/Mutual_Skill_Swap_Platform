import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { getSocket } from '../utils/socket';
import api, { getErrorMessage } from '../utils/api';
import { toast } from '../hooks/useToast';

// ── Sabitler ──────────────────────────────────────────────────
const STATUS_LABEL = {
  PENDING: 'Bekliyor', MATCHED: 'Eslesti', CONFIRMED: 'Onaylandi',
  ACTIVE: 'Aktif', COMPLETED: 'Tamamlandi', CANCELLED: 'Iptal', DISPUTED: 'Uyusmazlik',
};
const STATUS_COLOR = {
  PENDING: '#f59e0b', MATCHED: '#8b5cf6', CONFIRMED: '#06b6d4',
  ACTIVE: '#10b981', COMPLETED: '#6ee7b7', CANCELLED: '#ef4444', DISPUTED: '#f97316',
};

// ── Mesaj Balonu ──────────────────────────────────────────────
function MessageBubble({ msg, isOwn, prevSameSender }) {
  if (msg.type === 'system') {
    return (
      <div style={{
        textAlign: 'center', padding: '6px 0',
        fontSize: '0.75rem', color: 'var(--text-muted)',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        {msg.text}
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>
    );
  }

  const time = new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: '8px',
      marginTop: prevSameSender ? '4px' : '14px',
    }}>
      {/* Avatar — sadece ilk mesajta goster */}
      {!isOwn && (
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'var(--grad-brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: '700', flexShrink: 0,
          opacity: prevSameSender ? 0 : 1,
        }}>
          {msg.senderName?.[0]?.toUpperCase()}
        </div>
      )}

      <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: '3px' }}>
        {!prevSameSender && !isOwn && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: '4px' }}>
            {msg.senderName}
          </span>
        )}
        <div style={{
          padding: '10px 14px',
          borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isOwn
            ? 'linear-gradient(135deg, var(--purple), #7c3aed)'
            : 'var(--surface-3)',
          color: 'var(--text-primary)',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          wordBreak: 'break-word',
          boxShadow: isOwn ? '0 2px 12px rgba(147,51,234,0.3)' : 'none',
        }}>
          {msg.text}
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', paddingLeft: '4px', paddingRight: '4px' }}>
          {time}
        </span>
      </div>
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────
export default function SessionPage() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null);
  const [panel, setPanel] = useState('chat'); // 'chat' | 'info'

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  // Otomatik scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, otherTyping]);

  // Socket bağlantısı ve oturum verisi
  useEffect(() => {
    if (!token || !sessionId) return;

    // REST ile oturum verisini al
    api.get(`/sessions/${sessionId}`)
      .then(r => { setSession(r.data); setLoading(false); })
      .catch(() => navigate('/dashboard'));

    // Socket bağlantısı
    const socket = getSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join_session', { sessionId });
    });

    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('session_joined', ({ session: s, history, onlineUsers: ou }) => {
      setSession(s);
      setMessages(history);
      setOnlineUsers(ou);
    });

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('user_typing', ({ userId, isTyping: typing }) => {
      if (userId !== user?.id) setOtherTyping(typing);
    });

    socket.on('participant_joined', ({ userId }) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    });

    socket.on('participant_left', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
      setOtherTyping(false);
    });

    socket.on('session_started', ({ startedAt }) => {
      setSession(prev => prev ? { ...prev, status: 'ACTIVE', actualStartAt: startedAt } : prev);
    });

    socket.on('error', ({ message }) => {
      console.error('Socket error:', message);
    });

    // Zaten bağlıysa direkt join et
    if (socket.connected) {
      setSocketConnected(true);
      socket.emit('join_session', { sessionId });
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('session_joined');
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('participant_joined');
      socket.off('participant_left');
      socket.off('session_started');
      socket.off('error');
      socket.emit('leave_session', { sessionId });
    };
  }, [token, sessionId]);

  // Mesaj gönder
  const sendMessage = () => {
    const text = inputText.trim();
    if (!text || !socketRef.current) return;

    socketRef.current.emit('send_message', { sessionId, text });
    setInputText('');
    inputRef.current?.focus();

    // Yazma göstergesini durdur
    socketRef.current.emit('typing_stop', { sessionId });
    setIsTyping(false);
    clearTimeout(typingTimeoutRef.current);
  };

  // Yazma göstergesi
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socketRef.current) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing_start', { sessionId });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('typing_stop', { sessionId });
    }, 1500);
  };

  // Enter ile gönder
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // REST aksiyonları
  const doAction = async (type) => {
    setAction(type);
    try {
      await api.post(`/sessions/${sessionId}/${type}`);
      const r = await api.get(`/sessions/${sessionId}`);
      setSession(r.data);

      if (type === 'confirm' && socketRef.current) {
        // Her iki taraf onayladıysa oturumu başlat
        socketRef.current.emit('session_start_confirm', { sessionId });
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setAction(null);
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

  if (!session) return null;

  const isTeacher = session.teacherId === user?.id;
  const other = isTeacher ? session.learner : session.teacher;
  const isOtherOnline = onlineUsers.includes(other?.id);
  const canChat = ['CONFIRMED', 'ACTIVE'].includes(session.status);
  const scheduledDate = new Date(session.scheduledAt);

  return (
    <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Sol Panel: Sohbet ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        minWidth: 0,
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', gap: '12px',
          flexShrink: 0,
        }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px', padding: '4px', lineHeight: 1 }}>
            ←
          </button>

          {/* Karşı taraf avatarı */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'var(--grad-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: '700',
            }}>{other?.displayName?.[0]?.toUpperCase()}</div>
            {/* Online göstergesi */}
            <div style={{
              position: 'absolute', bottom: '1px', right: '1px',
              width: '10px', height: '10px', borderRadius: '50%',
              background: isOtherOnline ? '#10b981' : 'var(--text-muted)',
              border: '2px solid var(--surface)',
              transition: 'background 0.3s',
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '0.95rem' }}>
              {other?.displayName}
            </div>
            <div style={{ fontSize: '0.72rem', color: isOtherOnline ? '#10b981' : 'var(--text-muted)' }}>
              {isOtherOnline ? 'Cevrimici' : 'Cevrimdisi'}
            </div>
          </div>

          {/* Durum badge */}
          <span style={{
            padding: '4px 10px', borderRadius: 'var(--radius-full)',
            background: `${STATUS_COLOR[session.status]}18`,
            color: STATUS_COLOR[session.status],
            border: `1px solid ${STATUS_COLOR[session.status]}40`,
            fontSize: '0.72rem', fontWeight: '600', flexShrink: 0,
          }}>{STATUS_LABEL[session.status]}</span>

          {/* Socket durumu */}
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
            background: socketConnected ? '#10b981' : '#ef4444',
            title: socketConnected ? 'Baglı' : 'Baglantı kesildi',
          }} title={socketConnected ? 'Socket bagli' : 'Socket baglantisi yok'} />

          {/* Panel toggle */}
          <button onClick={() => setPanel(p => p === 'chat' ? 'info' : 'chat')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px', padding: '4px' }}
            title="Bilgi paneli">
            ⋮
          </button>
        </div>

        {/* Oturum başlamadıysa uyarı */}
        {session.status === 'MATCHED' && (
          <div style={{
            padding: '12px 20px', background: 'rgba(139,92,246,0.08)',
            borderBottom: '1px solid rgba(139,92,246,0.15)',
            display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
          }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--purple-light)', flex: 1 }}>
              Oturum henuz onaylanmadi. Sohbet baslatmak icin her iki tarafin da onaylamasi gerekiyor.
            </span>
            <button className="btn btn-primary btn-sm" onClick={() => doAction('confirm')} disabled={!!action}>
              {action === 'confirm' ? '...' : 'Onayla'}
            </button>
          </div>
        )}

        {session.status === 'CONFIRMED' && (
          <div style={{
            padding: '12px 20px', background: 'rgba(6,182,212,0.08)',
            borderBottom: '1px solid rgba(6,182,212,0.15)',
            display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
          }}>
            <span style={{ fontSize: '0.82rem', color: '#06b6d4', flex: 1 }}>
              Her iki taraf onayladi! Oturumu baslatmak icin butona tiklayin.
            </span>
            <button className="btn btn-primary btn-sm"
              onClick={() => { socketRef.current?.emit('session_start_confirm', { sessionId }); }}
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
              Oturumu Baslat
            </button>
          </div>
        )}

        {/* Mesaj alanı */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px',
          display: 'flex', flexDirection: 'column',
        }}>
          {messages.length === 0 && canChat && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', gap: '12px',
            }}>
              <div style={{ fontSize: '2.5rem' }}>💬</div>
              <p style={{ fontSize: '0.875rem' }}>Henuz mesaj yok. Ilk sen yaz!</p>
            </div>
          )}

          {!canChat && messages.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', gap: '12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem' }}>🔒</div>
              <p style={{ fontSize: '0.875rem' }}>Sohbet oturum onaylandiktan sonra acilir.</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const prev = messages[i - 1];
            const prevSameSender = prev?.senderId === msg.senderId && prev?.type !== 'system';
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isOwn={msg.senderId === user?.id}
                prevSameSender={prevSameSender}
              />
            );
          })}

          {/* Yazıyor göstergesi */}
          {otherTyping && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginTop: '10px', paddingLeft: '4px',
            }}>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--text-muted)',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{other?.displayName} yazıyor...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Mesaj giriş alanı */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          {canChat ? (
            <div style={{
              display: 'flex', gap: '10px', alignItems: 'flex-end',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '8px 8px 8px 16px',
              transition: 'border-color 0.2s',
            }}>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Mesaj yaz... (Enter = gonder, Shift+Enter = yeni satir)"
                rows={1}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem', resize: 'none', lineHeight: '1.5',
                  maxHeight: '120px', overflowY: 'auto',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim()}
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: inputText.trim() ? 'var(--grad-brand)' : 'var(--surface-3)',
                  border: 'none', cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0,
                  transition: 'all 0.2s var(--ease-spring)',
                  transform: inputText.trim() ? 'scale(1)' : 'scale(0.9)',
                }}>
                ↑
              </button>
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '12px',
              color: 'var(--text-muted)', fontSize: '0.825rem',
            }}>
              {session.status === 'COMPLETED' ? 'Bu oturum tamamlandi.' :
               session.status === 'CANCELLED' ? 'Bu oturum iptal edildi.' :
               'Sohbet icin oturumun onaylanmasi gerekiyor.'}
            </div>
          )}
        </div>
      </div>

      {/* ── Sag Panel: Bilgi / Aksiyonlar ── */}
      <div className="session-info-panel" style={{
        width: '300px', flexShrink: 0,
        background: 'var(--surface)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        padding: '20px',
        gap: '16px',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text-secondary)' }}>
          Oturum Bilgisi
        </h2>

        {/* Oturum detayları */}
        {[
          { label: 'Tarih', value: scheduledDate.toLocaleDateString('tr-TR', { dateStyle: 'medium' }) },
          { label: 'Saat', value: scheduledDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) },
          { label: 'Sure', value: `${session.durationMinutes} dakika` },
          { label: 'Kredi', value: `${session.creditAmount?.toFixed(1)} saat` },
          { label: 'Rol', value: isTeacher ? 'Ogretmen' : 'Ogrenci' },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: '1px solid var(--border)',
            fontSize: '0.85rem',
          }}>
            <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
            <span style={{ fontWeight: '500' }}>{item.value}</span>
          </div>
        ))}

        {/* Escrow */}
        {session.escrow && (
          <div style={{
            padding: '12px', borderRadius: 'var(--radius-md)',
            background: session.escrow.status === 'LOCKED'
              ? 'rgba(251,191,36,0.08)' : 'rgba(6,214,160,0.08)',
            border: `1px solid ${session.escrow.status === 'LOCKED' ? 'rgba(251,191,36,0.2)' : 'rgba(6,214,160,0.2)'}`,
            fontSize: '0.8rem',
          }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Escrow</div>
            <div style={{ color: session.escrow.status === 'LOCKED' ? '#fbbf24' : 'var(--cyan)', fontWeight: '600' }}>
              {session.escrow.amount?.toFixed(1)} kredi{' '}
              {session.escrow.status === 'LOCKED' ? 'kilitli' :
               session.escrow.status === 'RELEASED' ? 'aktarildi' : 'iade edildi'}
            </div>
          </div>
        )}

        {/* Aksiyonlar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          {session.status === 'MATCHED' && (
            <button className="btn btn-primary" onClick={() => doAction('confirm')} disabled={!!action}
              style={{ width: '100%', justifyContent: 'center' }}>
              {action === 'confirm' ? 'Onaylaniyor...' : '✓ Oturumu Onayla'}
            </button>
          )}
          {session.status === 'COMPLETED' && (
            <Link
              to={`/sessions/${sessionId}/review`}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, var(--cyan), #0891b2)' }}
            >
              ★ Degerlendirme Yap
            </Link>
          )}
          {session.status === 'ACTIVE' && (
            <button className="btn btn-primary" onClick={() => doAction('complete')} disabled={!!action}
              style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              {action === 'complete' ? '...' : 'Tamamlandi'}
            </button>
          )}
          {['MATCHED', 'CONFIRMED'].includes(session.status) && (
            <button className="btn btn-ghost" onClick={() => doAction('cancel')} disabled={!!action}
              style={{ width: '100%', justifyContent: 'center', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}>
              Iptal Et
            </button>
          )}
        </div>

        {/* Online katılımcılar */}
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Katilimcilar
          </div>
          {[session.teacher, session.learner].filter(Boolean).map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: 'var(--grad-brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700',
                }}>{p.displayName?.[0]?.toUpperCase()}</div>
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: onlineUsers.includes(p.id) ? '#10b981' : 'var(--text-muted)',
                  border: '1.5px solid var(--surface)',
                }} />
              </div>
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: '500' }}>{p.displayName}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {p.id === session.teacherId ? 'Ogretmen' : 'Ogrenci'}
                  {p.id === user?.id ? ' (sen)' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
