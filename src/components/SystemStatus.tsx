import { useState, useEffect } from 'react';

// Global status types: 'auto' | 'online' | 'offline'
export const SYSTEM_STATUS_KEY = 'remappro_system_status';

export type SystemStatusMode = 'auto' | 'online' | 'offline';

export const getSystemStatus = (): SystemStatusMode => {
  const stored = localStorage.getItem(SYSTEM_STATUS_KEY);
  if (stored === 'online' || stored === 'offline') return stored;
  return 'auto';
};

export const setSystemStatus = (mode: SystemStatusMode) => {
  localStorage.setItem(SYSTEM_STATUS_KEY, mode);
  // Dispatch event so all components update
  window.dispatchEvent(new CustomEvent('systemStatusChange', { detail: mode }));
};

export const isSystemOnline = (mode: SystemStatusMode): boolean => {
  if (mode === 'online') return true;
  if (mode === 'offline') return false;
  // Auto mode: Online from 08:00 to 20:00
  const hour = new Date().getHours();
  return hour >= 8 && hour < 20;
};

const SystemStatus = () => {
  const [mode, setMode] = useState<SystemStatusMode>(getSystemStatus);
  const [isOnline, setIsOnline] = useState(() => isSystemOnline(getSystemStatus()));

  useEffect(() => {
    const updateStatus = () => {
      const currentMode = getSystemStatus();
      setMode(currentMode);
      setIsOnline(isSystemOnline(currentMode));
    };

    // Listen for manual changes
    const handleChange = () => updateStatus();
    window.addEventListener('systemStatusChange', handleChange);
    window.addEventListener('storage', handleChange);

    // Check every minute for auto mode time changes
    const interval = setInterval(updateStatus, 60000);

    return () => {
      window.removeEventListener('systemStatusChange', handleChange);
      window.removeEventListener('storage', handleChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`w-2.5 h-2.5 rounded-full ${
          isOnline 
            ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
            : 'bg-gray-500'
        }`}
      />
      <span className={isOnline ? 'text-green-500' : 'text-muted-foreground'}>
        {isOnline ? 'ONLINE' : 'OFFLINE'}
      </span>
      {mode !== 'auto' && (
        <span className="text-xs text-muted-foreground/60">(Manual)</span>
      )}
    </div>
  );
};

export default SystemStatus;
