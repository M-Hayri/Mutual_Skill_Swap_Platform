import { useState, useEffect } from 'react';

const MONTHS = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
const DAYS_SHORT = ['Paz','Pzt','Sal','Car','Per','Cum','Cmt'];
const DURATIONS = [
  { value: 30,  label: '30 dk',  credit: 0.5 },
  { value: 60,  label: '1 saat', credit: 1.0 },
  { value: 90,  label: '1.5 saat', credit: 1.5 },
  { value: 120, label: '2 saat', credit: 2.0 },
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// Takvimde seçilebilecek en erken tarih = bugün + 2 saat
function getMinDate() {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  return d;
}

export default function DateTimePicker({ value, onChange, teacherAvailability = [], zaman_carpani = 1.0 }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [duration, setDuration] = useState(60);

  const minDate = getMinDate();

  // Öğretmenin müsait olduğu günler (0-6)
  const availableDays = new Set(teacherAvailability.map(a => a.dayOfWeek));

  // Seçilen güne göre müsait saatler
  const getAvailableSlots = (date) => {
    if (!date) return [];
    const dayOfWeek = date.getDay();
    const slots = teacherAvailability
      .filter(a => a.dayOfWeek === dayOfWeek)
      .map(a => a.startTime)
      .sort();

    // Eğer müsaitlik tanımlanmamışsa varsayılan saatler sun
    if (slots.length === 0) {
      return ['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','19:00','20:00','21:00'];
    }
    return slots;
  };

  // Değer değişince parent'ı bildir
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const [h, m] = selectedTime.split(':').map(Number);
      const dt = new Date(selectedDate);
      dt.setHours(h, m, 0, 0);
      onChange({ scheduledAt: dt.toISOString(), durationMinutes: duration });
    }
  }, [selectedDate, selectedTime, duration]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const isDisabled = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    if (d < minDate) return true;
    // Müsaitlik tanımlıysa gün kontrolü
    if (teacherAvailability.length > 0 && !availableDays.has(d.getDay())) return true;
    return false;
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    return selectedDate.getFullYear() === viewYear &&
           selectedDate.getMonth() === viewMonth &&
           selectedDate.getDate() === day;
  };

  const isToday = (day) => {
    return today.getFullYear() === viewYear &&
           today.getMonth() === viewMonth &&
           today.getDate() === day;
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const availableSlots = getAvailableSlots(selectedDate);
  const creditCost = (duration / 60) * zaman_carpani;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Takvim ── */}
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px',
      }}>
        {/* Ay navigasyonu */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px', padding: '4px 8px', borderRadius: '6px' }}>‹</button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '0.95rem' }}>
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px', padding: '4px 8px', borderRadius: '6px' }}>›</button>
        </div>

        {/* Gün başlıkları */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '6px' }}>
          {DAYS_SHORT.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', padding: '4px 0', fontWeight: '600' }}>{d}</div>
          ))}
        </div>

        {/* Günler */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {/* Boş hücreler */}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {/* Günler */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const disabled = isDisabled(day);
            const selected = isSelected(day);
            const today_ = isToday(day);
            const available = teacherAvailability.length > 0 &&
              availableDays.has(new Date(viewYear, viewMonth, day).getDay()) &&
              !disabled;

            return (
              <button
                key={day}
                onClick={() => !disabled && setSelectedDate(new Date(viewYear, viewMonth, day))}
                style={{
                  aspectRatio: '1', borderRadius: '8px',
                  border: selected ? '2px solid var(--purple)' : today_ ? '1px solid rgba(147,51,234,0.4)' : 'none',
                  background: selected
                    ? 'var(--grad-brand)'
                    : available
                    ? 'rgba(6,214,160,0.08)'
                    : 'transparent',
                  color: disabled
                    ? 'var(--text-muted)'
                    : selected
                    ? 'white'
                    : 'var(--text-primary)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: selected || today_ ? '700' : '400',
                  opacity: disabled ? 0.35 : 1,
                  transition: 'all 0.12s',
                  position: 'relative',
                }}
              >
                {day}
                {/* Müsait nokta */}
                {available && !selected && (
                  <span style={{
                    position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)',
                    width: '4px', height: '4px', borderRadius: '50%', background: 'var(--cyan)',
                    display: 'block',
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {teacherAvailability.length > 0 && (
          <div style={{ marginTop: '10px', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
            <span>🟢 Ogretmenin musait oldugu gunler</span>
          </div>
        )}
      </div>

      {/* ── Saat seçimi ── */}
      {selectedDate && (
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '16px',
          animation: 'fadeIn 0.25s ease',
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '600' }}>
            {selectedDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} icin saat sec
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {availableSlots.map(slot => {
              const isSelectedSlot = selectedTime === slot;
              // Geçmiş saatleri engelle
              const slotDate = new Date(selectedDate);
              const [h, m] = slot.split(':').map(Number);
              slotDate.setHours(h, m, 0, 0);
              const isPast = slotDate <= minDate;

              return (
                <button
                  key={slot}
                  onClick={() => !isPast && setSelectedTime(slot)}
                  disabled={isPast}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-full)',
                    border: `1px solid ${isSelectedSlot ? 'var(--purple)' : 'var(--border)'}`,
                    background: isSelectedSlot ? 'var(--grad-brand)' : 'var(--surface-3)',
                    color: isPast ? 'var(--text-muted)' : isSelectedSlot ? 'white' : 'var(--text-secondary)',
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    fontSize: '0.82rem', fontWeight: isSelectedSlot ? '600' : '400',
                    opacity: isPast ? 0.4 : 1,
                    transition: 'all 0.12s var(--ease-spring)',
                    transform: isSelectedSlot ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Süre seçimi ── */}
      {selectedDate && selectedTime && (
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '16px',
          animation: 'fadeIn 0.25s ease',
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '600' }}>
            Oturum suresi
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {DURATIONS.map(d => {
              const cost = (d.value / 60) * zaman_carpani;
              const isSelected = duration === d.value;
              return (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  style={{
                    flex: 1, padding: '12px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isSelected ? 'var(--purple)' : 'var(--border)'}`,
                    background: isSelected ? 'rgba(147,51,234,0.10)' : 'var(--surface-3)',
                    cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: isSelected ? 'var(--purple-light)' : 'var(--text-primary)', marginBottom: '3px' }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--cyan)' }}>
                    {cost.toFixed(1)} kredi
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Özet ── */}
      {selectedDate && selectedTime && (
        <div style={{
          padding: '14px 16px', borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, rgba(147,51,234,0.08), rgba(6,214,160,0.05))',
          border: '1px solid rgba(147,51,234,0.2)',
          animation: 'fadeIn 0.25s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '3px' }}>Planlanan Oturum</div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} · {selectedTime} · {DURATIONS.find(d => d.value === duration)?.label}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Kredi maliyeti</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1.1rem', color: 'var(--cyan)' }}>
                {creditCost.toFixed(1)} saat
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
