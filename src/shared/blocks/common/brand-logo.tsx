import { Link } from '@/core/i18n/navigation';
import { Brand as BrandType } from '@/shared/types/blocks/common';

export function BrandLogo({ brand }: { brand: BrandType }) {
  return (
    <Link
      href={brand.url || ''}
      target={brand.target || '_self'}
      className={`flex items-center gap-3 ${brand.className || ''}`}
    >
      <div className="bg-primary/90 flex h-10 w-10 items-center justify-center rounded-xl shadow-sm select-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
          className="text-primary-foreground"
          aria-hidden="true"
        >
          {/* Person's head */}
          <circle cx="12" cy="8" r="3.5" fill="currentColor" />

          {/* Person's body */}
          <path
            d="M12 12c-2.5 0-4 1.5-4 3.5v4c0 0.5 0.5 1 1 1h6c0.5 0 1-0.5 1-1v-4c0-2-1.5-3.5-4-3.5z"
            fill="currentColor"
          />

          {/* Left arm (straight down) */}
          <path
            d="M8.5 14.5c-0.8 0.3-1.5 1-1.5 2v3.5c0 0.3 0.2 0.5 0.5 0.5s0.5-0.2 0.5-0.5v-3.5c0-0.5 0.3-0.8 0.5-1v-1z"
            fill="currentColor"
          />

          {/* Right arm raised with hand holding banana */}
          <path
            d="M15.5 14c0.3 0.2 1.5 0.5 2.5 0l1-3c0.2-0.3 0.2-0.5 0-0.8-0.2-0.2-0.5-0.2-0.8 0l-2.7 1.8v2z"
            fill="currentColor"
          />

          {/* Banana - curved shape */}
          <g transform="translate(17, 7) rotate(-30)">
            <path
              d="M0 0c2 0 3.5 0.8 4 2.5c0.3 1-0.5 2-1.5 2.2c-1.5 0.3-2.5-0.2-3-1.2C-1 2.5-0.5 0.5 0 0z"
              fill="#FFE34D"
              stroke="#FFC700"
              strokeWidth="0.5"
            />
            {/* Banana highlight */}
            <ellipse
              cx="1.5"
              cy="1.2"
              rx="1"
              ry="0.5"
              fill="#FFF59D"
              opacity="0.6"
            />
          </g>

          {/* Motion lines suggesting eating/consuming */}
          <g opacity="0.6">
            <path
              d="M19 11c0.5-0.5 1-0.8 1.5-1"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
            <path
              d="M20 13c0.6-0.3 1.2-0.5 1.8-0.6"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
      <span className="text-slate-900 dark:text-slate-100 text-2xl font-semibold tracking-tight">
        {brand.title || 'Cyber Hero Prompt'}
      </span>
    </Link>
  );
}