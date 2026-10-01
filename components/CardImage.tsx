/* eslint-disable @next/next/no-img-element */
export default function CardImage({ src, alt, badge }: { src: string; alt: string; badge?: string }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-turmeric to-chili">
      {src ? (
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-6xl">🌶️</div>
      )}
      {badge && (
        <span className="absolute right-3 top-3 rounded-full bg-turmeric px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow">
          ↺ {badge}
        </span>
      )}
    </div>
  );
}
