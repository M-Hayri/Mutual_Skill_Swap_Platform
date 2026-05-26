import { useState, useCallback, useEffect } from 'react';

let toastQueue = [];
let listeners = [];

function notify(listeners, toasts) {
  listeners.forEach(fn => fn([...toasts]));
}

export function toast(message, type = 'error', duration = 4000) {
  const id = Date.now() + Math.random();
  toastQueue = [...toastQueue, { id, message, type, duration }];
  notify(listeners, toastQueue);
  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    notify(listeners, toastQueue);
  }, duration);
}

export function useToastStore() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const fn = (ts) => setToasts(ts);
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  }, []);
  const remove = useCallback((id) => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    notify(listeners, toastQueue);
  }, []);
  return { toasts, remove };
}

// Yardımcı kısayollar
toast.success = (msg, dur) => toast(msg, 'success', dur);
toast.error   = (msg, dur) => toast(msg, 'error',   dur);
toast.info    = (msg, dur) => toast(msg, 'info',    dur);
toast.warning = (msg, dur) => toast(msg, 'warning', dur);
