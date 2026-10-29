import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Bell, Sparkles, ShieldCheck } from 'lucide-react';

interface AndroidStatusBarProps {
  isDarkMode?: boolean;
}

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({ isDarkMode = false }) => {
  const [time, setTime] = useState<string>('11:21');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setTime(`${hours % 12 || 12}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative z-30 flex h-7 w-full select-none items-center justify-between px-5 text-[11px] font-semibold tracking-tight transition-colors">
      {/* Left side: Clock and app notification dots */}
      <div className="flex items-center gap-2">
        <span className="font-bold tracking-tight text-neutral-800 dark:text-neutral-100 font-mono">
          {time}
        </span>
        <div className="flex items-center gap-1 opacity-70">
          <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" title="NOVA Notification" />
          <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400" />
        </div>
      </div>

      {/* Center punch-hole camera simulation on phone mockup */}
      <div className="hidden sm:block absolute left-1/2 top-1.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-neutral-900 ring-2 ring-neutral-800 dark:bg-black dark:ring-neutral-900" />

      {/* Right side: Connection, Battery & Status */}
      <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-100">
        <span className="text-[10px] font-bold font-mono tracking-tighter">5G</span>
        <Wifi className="h-3 w-3" />
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] font-bold font-mono">98%</span>
          <div className="relative flex h-2.5 w-4 items-center rounded-xs border border-current p-0.2">
            <div className="h-full w-3.5 bg-emerald-500 rounded-2xs" />
          </div>
        </div>
      </div>
    </div>
  );
};
