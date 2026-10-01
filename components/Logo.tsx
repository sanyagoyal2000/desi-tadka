// Tadka flame over a kadhai that doubles as a dumbbell: food and fitness in one mark.
export default function Logo({ className = "size-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="var(--color-chili)" />
      {/* tadka flame */}
      <path d="M24 5c3.4 4.2 6 7.3 6 11.1a6 6 0 0 1-12 0c0-2.2 1.1-3.9 2.6-5.4.3 1.9 1.2 2.9 2.4 2.9C23 11.6 23.2 9 24 5Z" fill="var(--color-turmeric)" />
      {/* dumbbell bar with stacked plates: tall inner, shorter outer */}
      <path d="M3 29h42" stroke="#fdf6ee" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="7.5" y="18" width="5" height="22" rx="2" fill="#fdf6ee" />
      <rect x="3.5" y="22" width="4.5" height="14" rx="1.8" fill="#fdf6ee" />
      <rect x="35.5" y="18" width="5" height="22" rx="2" fill="#fdf6ee" />
      <rect x="40" y="22" width="4.5" height="14" rx="1.8" fill="#fdf6ee" />
      {/* kadhai */}
      <path d="M15 27.5h18c0 5-4 9-9 9S15 32.5 15 27.5Z" fill="#fdf6ee" />
    </svg>
  );
}
