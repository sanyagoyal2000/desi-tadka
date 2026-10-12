import { ArrowsClockwise } from "@phosphor-icons/react/dist/ssr";

export default function SwapButton({ onClick, busy, label }: { onClick: () => void; busy?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={`Swap ${label}`}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-electric-soft text-electric transition active:scale-90 disabled:animate-spin disabled:opacity-60"
    >
      <ArrowsClockwise aria-hidden="true" size={20} weight="bold" />
    </button>
  );
}
