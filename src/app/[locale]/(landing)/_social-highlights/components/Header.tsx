import React from 'react';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ searchQuery, onSearchChange }) => {
  const t = useTranslations('social.landing');

  return (
    <div className="py-10 px-4 md:px-8 max-w-7xl mx-auto w-full font-[family-name:var(--font-manrope)] flex justify-center">
      <div className="relative w-full max-w-2xl">
        {/* Input Container */}
        <div className="relative flex items-center bg-white dark:bg-secondary/50 rounded-[24px] border border-gray-100 dark:border-none shadow-none focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.04)] focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300 group">
          
          {/* Search Icon */}
          <div className="pl-6 text-gray-500 dark:text-gray-400 group-focus-within:text-primary transition-colors duration-300">
            <Search className="h-5 w-5" />
          </div>

          {/* Input Field */}
          <input
            type="text"
            className="w-full h-16 !bg-transparent border-none outline-none text-base text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 pl-4 pr-32 rounded-[24px] font-medium"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />

          {/* Search Button */}
          <div className="absolute right-2 top-2 bottom-2">
            <button className="h-full px-6 bg-primary text-primary-foreground rounded-[18px] text-sm font-bold tracking-wide hover:bg-primary/90 transition-all duration-200 shadow-sm flex items-center gap-2">
              {t('search_button')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
