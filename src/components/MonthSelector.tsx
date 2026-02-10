'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface MonthSelectorProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  formatMonth: (key: string) => string;
  className?: string;
  id?: string;
}

export default function MonthSelector({
  value,
  options,
  onChange,
  formatMonth,
  className = '',
  id,
}: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (monthKey: string) => {
    onChange(monthKey);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-[#00d2ff]/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#00d2ff]/20 shadow-[0_0_10px_rgba(0,210,255,0.4)] min-h-[40px] flex items-center justify-between hover:border-[#00d2ff]/40 hover:shadow-[0_0_15px_rgba(0,210,255,0.5)] transition-all"
      >
        <span>{formatMonth(value)}</span>
        <ChevronDown
          size={16}
          className={`text-[#00d2ff] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-[#0a0a0a] border border-[#00d2ff]/30 rounded-lg shadow-[0_0_20px_rgba(0,210,255,0.4)] overflow-hidden backdrop-blur-sm">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((month) => {
              const isSelected = month === value;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleSelect(month)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-all first:rounded-t-lg last:rounded-b-lg ${
                    isSelected
                      ? 'bg-[#00d2ff]/20 text-[#00d2ff] font-medium shadow-[inset_0_0_10px_rgba(0,210,255,0.2)]'
                      : 'text-white hover:bg-[#00d2ff]/10 hover:text-[#00d2ff] active:bg-[#00d2ff]/15'
                  }`}
                >
                  {formatMonth(month)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
