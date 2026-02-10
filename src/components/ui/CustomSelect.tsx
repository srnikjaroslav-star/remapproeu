'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function CustomSelect({ label, options, value, onChange }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zatvorenie pri kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label} <span className="text-red-400">*</span>
      </label>
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#00d2ff]/50 rounded-lg text-white cursor-pointer flex justify-between items-center hover:border-[#00d2ff] transition-all shadow-[0_0_15px_rgba(0,210,255,0.1)] active:scale-[0.98]"
      >
        <span className="truncate">{value}</span>
        <ChevronDown 
          size={18} 
          className={`text-[#00d2ff] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-[#0a0a0a] border border-[#00d2ff]/30 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option) => (
              <div
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`px-4 py-3 text-sm cursor-pointer transition-colors ${
                  value === option 
                    ? 'bg-[#00d2ff]/20 text-[#00d2ff] font-semibold' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-[#00d2ff]'
                }`}
              >
                {option}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}