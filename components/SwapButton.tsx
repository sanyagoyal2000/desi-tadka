export default function SwapButton({ onClick, busy, label }: { onClick: () => void; busy?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={`Swap ${label}`}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-turmeric-soft text-xl font-bold text-turmeric transition active:scale-90 disabled:animate-spin disabled:opacity-60"
    >
      ↺
    </button>
  );
}
