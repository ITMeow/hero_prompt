import React from 'react';
import { DateChips } from './DateChips';

interface HeaderProps {
  onAdminClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onAdminClick }) => {
  return (
    <div className="pt-6 pb-4 px-4 md:px-8 max-w-7xl mx-auto w-full font-[family-name:var(--font-manrope)]">
      {/* Date Picker Row */}
      <DateChips />
    </div>
  );
};