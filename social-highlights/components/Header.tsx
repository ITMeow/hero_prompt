import React from 'react';
import { LayoutGrid, Compass, BookOpen, Bookmark, Banana } from 'lucide-react';
import { DateChips } from './DateChips';

interface HeaderProps {
  onAdminClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onAdminClick }) => {
  return (
    <div className="pt-6 pb-4 px-4 md:px-8 max-w-7xl mx-auto w-full">
      {/* Top Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              {/* Logo Box - Uses the high saturation banana yellow #FFEA00 */}
              <div className="w-10 h-10 bg-[#FFEA00] rounded-xl flex items-center justify-center shadow-sm text-slate-900 select-none">
                <Banana size={24} className="text-slate-900" fill="currentColor" fillOpacity={0.1} />
              </div>
              {/* Title - Updated to Manrope SemiBold to match reference */}
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Banana Prompts</h1>
            </div>

            {/* Navigation Items from reference image (Explore, Blog, Bookmarks) */}
            <div className="hidden md:flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100/80 hover:bg-gray-200/80 rounded-full text-sm font-semibold text-slate-700 transition-colors">
                    <Compass size={18} />
                    Explore
                </button>
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-full text-sm font-semibold text-slate-600 transition-colors">
                    <BookOpen size={18} />
                    Blog
                </button>
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-full text-sm font-semibold text-slate-600 transition-colors">
                    <Bookmark size={18} />
                    Bookmarks
                </button>
            </div>
        </div>
        
        <div className="flex items-center gap-3 self-end md:self-auto">
          <button onClick={onAdminClick} className="p-2.5 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-[#FFEA00] hover:bg-slate-900 transition-all" title="Admin">
            <LayoutGrid size={20} />
          </button>
           <div className="w-px h-8 bg-gray-200 mx-1"></div>
          <button className="p-1 rounded-full hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden border border-gray-200">
                <img src="https://picsum.photos/seed/user/100/100" alt="Profile" className="w-full h-full object-cover" />
            </div>
          </button>
        </div>
      </div>

      {/* Date Picker Row */}
      <DateChips />
    </div>
  );
};