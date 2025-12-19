import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { useTranslations } from 'next-intl';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ searchQuery, onSearchChange }) => {
  const t = useTranslations('social.landing');

  return (
    <div className="pt-6 pb-4 px-4 md:px-8 max-w-7xl mx-auto w-full font-[family-name:var(--font-manrope)]">
      <div className="relative max-w-md mx-auto">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Search title, description, prompt..."
          className="pl-10 bg-white dark:bg-card border-gray-200 dark:border-border rounded-full"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
};
