import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  subtitle?: string;
  invert?: boolean;
}

/**
 * Classic Black Illustration Brand Seal
 * Timeless monochrome engraving with open codex, torch of learning,
 * radiating sunburst, and classical laurel wreath.
 * Strictly black/monochrome — no cheap color gradients.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showWordmark = true,
  subtitle = 'TNPSC ACADEMY · EST. 2026',
  invert = false,
}) => {
  const iconSizeMap = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const titleSizeMap = {
    sm: 'text-sm font-serif tracking-wider',
    md: 'text-base font-serif tracking-widest',
    lg: 'text-lg font-serif tracking-widest',
    xl: 'text-2xl font-serif tracking-widest',
  };

  const subSizeMap = {
    sm: 'text-[9px] tracking-widest',
    md: 'text-[10px] tracking-widest',
    lg: 'text-[11px] tracking-widest',
    xl: 'text-xs tracking-widest',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Classic Black Illustration Seal SVG */}
      <div
        className={`relative flex items-center justify-center shrink-0 ${iconSizeMap[size]} ${
          invert ? 'text-white' : 'text-neutral-950 dark:text-neutral-50'
        }`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Outer classical engraved border ring */}
          <circle
            cx="50"
            cy="50"
            r="46"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="1.5 1.5"
          />
          <circle cx="50" cy="50" r="43" stroke="currentColor" strokeWidth="1" />
          <circle cx="50" cy="50" r="39.5" stroke="currentColor" strokeWidth="0.75" />

          {/* Classical Laurel Wreath Left */}
          <path
            d="M 23 58 C 21 44 26 31 38 23 C 34 29 32 37 34 46 C 35 50 34 55 28 58 Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M 27 67 C 22 57 24 45 32 38 C 30 46 31 54 36 60 Z"
            fill="currentColor"
            opacity="0.85"
          />
          <path
            d="M 36 75 C 29 70 28 60 34 52 C 36 58 40 64 45 68 Z"
            fill="currentColor"
            opacity="0.8"
          />

          {/* Classical Laurel Wreath Right */}
          <path
            d="M 77 58 C 79 44 74 31 62 23 C 66 29 68 37 66 46 C 65 50 66 55 72 58 Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M 73 67 C 78 57 76 45 68 38 C 70 46 69 54 64 60 Z"
            fill="currentColor"
            opacity="0.85"
          />
          <path
            d="M 64 75 C 71 70 72 60 66 52 C 64 58 60 64 55 68 Z"
            fill="currentColor"
            opacity="0.8"
          />

          {/* Torch of Enlightenment & Knowledge in Center */}
          {/* Flame Rays / Sunburst */}
          <line x1="50" y1="12" x2="50" y2="17" stroke="currentColor" strokeWidth="1.2" />
          <line x1="44" y1="14" x2="46" y2="18" stroke="currentColor" strokeWidth="1.2" />
          <line x1="56" y1="14" x2="54" y2="18" stroke="currentColor" strokeWidth="1.2" />
          <line x1="39" y1="18" x2="43" y2="21" stroke="currentColor" strokeWidth="1" />
          <line x1="61" y1="18" x2="57" y2="21" stroke="currentColor" strokeWidth="1" />

          {/* Central Torch Flame */}
          <path
            d="M 50 18 C 47 22 46 25 48 29 C 49 31 51 31 50 33 C 48 31 46 27 47 24 C 47 21 49 19 50 18 Z"
            fill="currentColor"
          />
          <path
            d="M 50 18 C 53 22 54 25 52 29 C 51 31 49 31 50 33 C 52 31 54 27 53 24 C 53 21 51 19 50 18 Z"
            fill="currentColor"
          />
          <ellipse cx="50" cy="27" rx="1.5" ry="3" fill="currentColor" />

          {/* Torch Bowl & Handle */}
          <path
            d="M 45 32 L 55 32 L 53 36 L 47 36 Z"
            stroke="currentColor"
            strokeWidth="0.8"
            fill="currentColor"
          />
          <rect x="48.5" y="36" width="3" height="9" fill="currentColor" rx="0.5" />

          {/* Classical Open Book / Treatise */}
          <path
            d="M 50 51 C 45 47 38 48 33 50 L 33 66 C 38 64 45 63 50 67 C 55 63 62 64 67 66 L 67 50 C 62 48 55 47 50 51 Z"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
          />
          {/* Book Spine Center Divider */}
          <line x1="50" y1="51" x2="50" y2="67" stroke="currentColor" strokeWidth="1.2" />

          {/* Book text line etchings */}
          <line x1="36" y1="54" x2="47" y2="52" stroke="currentColor" strokeWidth="0.75" />
          <line x1="36" y1="57.5" x2="47" y2="55.5" stroke="currentColor" strokeWidth="0.75" />
          <line x1="36" y1="61" x2="47" y2="59" stroke="currentColor" strokeWidth="0.75" />

          <line x1="53" y1="52" x2="64" y2="54" stroke="currentColor" strokeWidth="0.75" />
          <line x1="53" y1="55.5" x2="64" y2="57.5" stroke="currentColor" strokeWidth="0.75" />
          <line x1="53" y1="59" x2="64" y2="61" stroke="currentColor" strokeWidth="0.75" />

          {/* Classical Roman Pillar Pedestal */}
          <path
            d="M 42 74 L 58 74 L 56 79 L 44 79 Z"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
          <line x1="40" y1="79" x2="60" y2="79" stroke="currentColor" strokeWidth="1.2" />

          {/* Star of Excellence Bottom */}
          <polygon
            points="50,81 51.5,84 55,84.5 52.5,87 53,90.5 50,89 47,90.5 47.5,87 45,84.5 48.5,84"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Classic Typography Wordmark */}
      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black uppercase text-neutral-950 dark:text-neutral-50 tracking-widest font-serif ${titleSizeMap[size]}`}
            >
              YASH
            </span>
            <span className="h-1 w-1 rounded-full bg-neutral-900 dark:bg-neutral-100" />
            <span className="text-[11px] font-sans font-semibold tracking-wider text-neutral-600 dark:text-neutral-400">
              TNPSC
            </span>
          </div>
          {subtitle && (
            <span
              className={`font-medium uppercase text-neutral-500 dark:text-neutral-400 font-sans ${subSizeMap[size]}`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
