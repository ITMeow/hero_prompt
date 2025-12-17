import React from 'react';

const dates = [
  { label: 'Today', subLabel: '16 Dec', active: true },
  { label: 'Yesterday', subLabel: '12 Dec', active: false },
  { label: 'Sat', subLabel: '11 Dec', active: false },
  { label: 'Fri', subLabel: '11 Dec', active: false },
  { label: 'Thu', subLabel: '9 Dec', active: false },
  { label: 'Wed', subLabel: '8 Dec', active: false },
  { label: 'Tue', subLabel: '7 Dec', active: false },
  { label: 'Mon', subLabel: '6 Dec', active: false },
];

export const DateChips: React.FC = () => {
  return (
    <div className="flex space-x-3 overflow-x-auto no-scrollbar py-2">
      {dates.map((date, idx) => (
        <button
          key={idx}
          className={`
            flex flex-col items-center justify-center min-w-[64px] h-[64px] rounded-[24px] transition-all duration-200 active:scale-95
            ${date.active 
              ? 'bg-[#FFEA00] text-slate-900 shadow-lg shadow-[#FFEA00]/40 scale-105' 
              : 'bg-white text-gray-500 hover:bg-gray-50'}
          `}
        >
          <span className={`text-xs font-bold ${date.active ? 'text-slate-900' : 'text-gray-900'}`}>
            {date.label}
          </span>
          <span className={`text-[10px] font-medium ${date.active ? 'text-slate-800/70' : 'text-gray-400'}`}>
            {date.subLabel}
          </span>
        </button>
      ))}
    </div>
  );
};
