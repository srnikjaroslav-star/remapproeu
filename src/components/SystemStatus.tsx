import { useState, useEffect } from 'react';

interface SystemStatusProps {
  forceOffline?: boolean;
}

const SystemStatus = ({ forceOffline = false }: SystemStatusProps) => {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      if (forceOffline) {
        setIsOnline(false);
        return;
      }

      const now = new Date();
      const hour = now.getHours();
      // Online from 08:00 to 20:00 (8 AM to 8 PM)
      setIsOnline(hour >= 8 && hour < 20);
    };

    checkStatus();
    // Check every minute
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [forceOffline]);

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
    </div>
  );
};

export default SystemStatus;
