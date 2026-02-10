'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        style: {
          background: 'rgba(10, 10, 10, 0.95)',
          border: '1px solid rgba(0, 210, 255, 0.3)',
          color: '#ffffff',
        },
        className: 'glass',
      }}
    />
  );
}
