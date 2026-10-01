export default function Logo({ className = "size-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="var(--color-chili)" />
      {/* tadka flame */}
      <path d="M24 9c4 5 7 8.5 7 13a7 7 0 0 1-14 0c0-2.6 1.3-4.6 3-6.4.3 2.2 1.4 3.4 2.8 3.4C22 15 22.6 12 24 9Z" fill="var(--color-turmeric)" />
      {/* kadhai */}
      <path d="M9 27h30c0 6.6-6.7 12-15 12S9 33.6 9 27Z" fill="#fdf6ee" />
      <path d="M6.5 27h4M37.5 27h4" stroke="#fdf6ee" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
