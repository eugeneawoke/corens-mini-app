"use client";

type BeaconHeroProps = {
  active: boolean;
  size?: number;
};

export function BeaconHero({ active, size = 56 }: BeaconHeroProps) {
  return (
    <div className="corens-beacon-hero" data-active={String(active)} aria-hidden="true">
      <div className="corens-beacon-hero-icon">
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 21h14" />
          <path d="M8 21v-2h8v2" />
          <path d="M9 19l-1-8h8l-1 8" />
          <path d="M8.6 14.5h6.8" />
          <rect x="7" y="7" width="10" height="4" rx="0.5" />
          <path d="M7.5 7 Q12 4 16.5 7" />
        </svg>
      </div>
    </div>
  );
}
