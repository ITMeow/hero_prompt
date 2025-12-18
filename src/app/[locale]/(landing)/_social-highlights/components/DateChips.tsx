import React, { useMemo } from 'react';
import moment from 'moment';

interface DateChipsProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

export const DateChips: React.FC<DateChipsProps> = ({ selectedDate, onDateSelect }) => {
  const dates = useMemo(() => {
    // Start date fixed as per requirement
    const startDate = moment('2025-12-01');
    // End date is today. 
    // In a real scenario, if today is before start date, this loop won't generate anything.
    // We assume the environment date is >= 2025-12-01 as per user context.
    // If not, we use startDate as the only date or handle it.
    let current = moment();
    
    // Ensure we don't go back before startDate
    if (current.isBefore(startDate)) {
      current = startDate.clone();
    }

    const dateList = [];
    
    // Generate dates from current (Today) back to startDate
    while (current.isSameOrAfter(startDate, 'day')) {
      dateList.push({
        fullDate: current.format('YYYY-MM-DD'),
        label: getLabel(current),
        subLabel: current.format('D MMM'), // e.g. 16 Dec
      });
      current.subtract(1, 'days');
    }
    
    return dateList;
  }, []);

  function getLabel(date: moment.Moment) {
    const today = moment();
    if (date.isSame(today, 'day')) return 'Today';
    if (date.isSame(today.clone().subtract(1, 'days'), 'day')) return 'Yesterday';
    return date.format('ddd'); // Mon, Tue...
  }

  return (
    <div className="flex space-x-3 overflow-x-auto scrollbar-hide py-2 font-[family-name:var(--font-manrope)]">
      {dates.map((date) => {
        const isActive = date.fullDate === selectedDate;
        return (
          <button
            key={date.fullDate}
            onClick={() => onDateSelect(date.fullDate)}
            className={`
              flex flex-col items-center justify-center min-w-[64px] h-[64px] rounded-[24px] transition-all duration-200 active:scale-95
              ${isActive
                ? 'bg-primary text-slate-900 shadow-lg shadow-primary/40 scale-105'
                : 'bg-white dark:bg-card text-gray-500 hover:bg-gray-50 dark:hover:bg-accent'}
            `}
          >
            <span className={`text-xs font-bold ${isActive ? 'text-slate-900' : 'text-gray-900 dark:text-foreground'}`}>
              {date.label}
            </span>
            <span className={`text-[10px] font-medium ${isActive ? 'text-slate-800/70' : 'text-gray-400'}`}>
              {date.subLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
};

