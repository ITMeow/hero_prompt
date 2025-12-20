import { Link } from '@/core/i18n/navigation';
import { Brand as BrandType } from '@/shared/types/blocks/common';

export function BrandLogo({ brand }: { brand: BrandType }) {
  return (
    <Link
      href={brand.url || ''}
      target={brand.target || '_self'}
      className={`flex items-center gap-3 ${brand.className || ''}`}
    >
      <div className="bg-primary/90 flex h-11 w-11 items-center justify-center rounded-xl shadow-sm select-none overflow-hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary-foreground"
        >
          {/* Poster Canvas */}
          <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
          {/* Star Eye Left */}
          <path d="M9 7v4M7 9h4" transform="rotate(45 9 9)" />
          {/* Star Eye Right */}
          <path d="M15 7v4M13 9h4" transform="rotate(45 15 9)" />
          {/* Happy Smile */}
          <path d="M8 15c1.5 2 4.5 2 8 0" />
        </svg>
      </div>
      <span className="text-slate-900 dark:text-slate-100 text-2xl font-semibold tracking-tight">
        {brand.title || 'Cyber Hero Prompt'}
      </span>
    </Link>
  );
}
