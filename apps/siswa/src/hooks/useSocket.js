import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../lib/api';

function resolveSocketUrl() {
  const base = import.meta.env.VITE_API_BASE_URL || '/api';
  if (base.startsWith('http')) {
    return base.replace(/\/api\/?$/, '');
  }
  return window.location.origin;
}

/**
 * Koneksi Socket.IO persisten (satu koneksi per tab, reconnect otomatis).
 */
export function useSocket(handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;

    const socket = io(resolveSocketUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    const bind = (event, fn) => {
      if (typeof fn !== 'function') return;
      const wrapper = (payload) => handlersRef.current[event]?.(payload);
      socket.on(event, wrapper);
      return () => socket.off(event, wrapper);
    };

    const unbinds = Object.entries(handlersRef.current).map(([event, fn]) => bind(event, fn));

    return () => {
      unbinds.forEach((off) => off?.());
      socket.disconnect();
    };
  }, []);
}
