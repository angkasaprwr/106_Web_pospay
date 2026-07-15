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
 * Koneksi Socket.IO sekali (realtime update tanpa polling).
 * @param {Record<string, (payload: any) => void>} handlers
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
      reconnectionDelay: 1500,
    });

    const entries = Object.entries(handlersRef.current);
    entries.forEach(([event, fn]) => {
      if (typeof fn === 'function') {
        socket.on(event, (payload) => handlersRef.current[event]?.(payload));
      }
    });

    return () => {
      entries.forEach(([event]) => socket.off(event));
      socket.disconnect();
    };
  }, []);
}
