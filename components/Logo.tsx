// Tadka flame over a kadhai that doubles as a dumbbell: food and fitness in one mark.
export default function Logo({ className = "size-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="var(--color-chili)" />
      {/* tadka flame */}
      <path d="M24 6c3.6 4.4 6.3 7.6 6.3 11.6a6.3 6.3 0 0 1-12.6 0c0-2.3 1.2-4.1 2.7-5.7.3 2 1.3 3 2.5 3C23 12 23.2 9.4 24 6Z" fill="var(--color-turmeric)" />
      {/* dumbbell bar and plates */}
      <path d="M4.5 28h39" stroke="#fdf6ee" strokeWidth="3" strokeLinecap="round" />
      <rect x="5" y="21" width="5" height="14" rx="1.6" fill="#fdf6ee" />
      <rect x="38" y="21" width="5" height="14" rx="1.6" fill="#fdf6ee" />
      {/* kadhai */}
      <path d="M12.5 26.5h23c0 6.4-5.1 11.5-11.5 11.5S12.5 32.9 12.5 26.5Z" fill="#fdf6ee" />
    </svg>
  );
}
