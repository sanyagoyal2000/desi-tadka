import { safeNext } from "@/lib/access";

// Shown on the server copy until the access code is entered once on this phone/browser.
export default async function Unlock(props: PageProps<"/unlock">) {
  const q = await props.searchParams;
  const next = safeNext(q.next);
  return (
    <main className="flex flex-col gap-4">
      <form method="post" action="/api/unlock" className="rounded-3xl bg-surface p-5 shadow-[0_8px_30px_rgba(42,26,16,0.08)]">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="code" className="font-display text-xl font-bold">
          Enter your access code
        </label>
        <p className="mt-1 text-sm text-ink/60">This copy of DesiTadka is private. You only need to do this once on each phone or browser.</p>
        <input
          id="code"
          name="code"
          type="password"
          autoComplete="current-password"
          required
          className="mt-3 w-full rounded-2xl border-2 border-transparent bg-cream px-4 py-3 text-base outline-none focus:border-turmeric"
        />
        {q.wrong && (
          <p role="alert" className="mt-2 text-sm font-semibold text-chili">
            That code isn&apos;t right. Try again.
          </p>
        )}
        <button type="submit" className="mt-3 w-full rounded-2xl bg-chili py-3 font-display text-lg font-bold text-white">
          Unlock
        </button>
      </form>
    </main>
  );
}
