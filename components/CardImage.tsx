/* eslint-disable @next/next/no-img-element */
import { ArrowsClockwise, Barbell, ForkKnife } from "@phosphor-icons/react/dist/ssr";

export default function CardImage({ src, alt, badge, kind = "recipe" }: { src: string; alt: string; badge?: string; kind?: "recipe" | "workout" }) {
  const Placeholder = kind === "recipe" ? ForkKnife : Barbell;
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-electric-soft">
      {src ? (
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-electric">
          <Placeholder aria-hidden="true" size={64} weight="duotone" />
        </div>
      )}
      {badge && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-electric px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow">
          <ArrowsClockwise aria-hidden="true" size={14} weight="bold" />
          {badge}
        </span>
      )}
    </div>
  );
}
