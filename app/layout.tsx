import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";
import { CalendarBlank, Target } from "@phosphor-icons/react/dist/ssr";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["600", "700", "800", "900"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DesiTadka",
  description: "Turn Western fitness reels into recipes and workouts that fit Indian kitchens.",
};

export const viewport: Viewport = { themeColor: "#08112b", width: "device-width", initialScale: 1 };

const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem("theme")}catch(e){}if(t!=="light"&&t!=="dark")t="dark";document.documentElement.setAttribute("data-theme",t)})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} ${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Resolve the theme (saved choice, else dark) before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-16">
          <header className="flex items-center justify-between gap-3 py-5">
            <Link href="/" className="flex min-w-0 items-center gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-electric">
              <Logo />
              <span className="flex flex-col">
                <span className="font-display text-xl font-black uppercase leading-none tracking-tight sm:text-2xl">
                  Desi<span className="text-gradient">Tadka</span>
                </span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/60">Fitness reels, remade for India</span>
              </span>
            </Link>
            <nav className="flex shrink-0 items-center gap-2">
              <Link
                href="/today"
                aria-label="Today"
                className="flex h-10 items-center gap-1.5 rounded-full bg-volt px-3 text-sm font-bold text-white shadow-[0_2px_8px_rgba(24,12,80,0.08)] focus-visible:outline-2 focus-visible:outline-electric"
              >
                <Target aria-hidden="true" size={18} weight="bold" />
                <span className="hidden min-[400px]:inline">Today</span>
              </Link>
              <Link
                href="/plan"
                className="flex h-10 items-center gap-1.5 rounded-full bg-surface px-3 text-sm font-bold text-volt shadow-[0_2px_8px_rgba(24,12,80,0.08)] focus-visible:outline-2 focus-visible:outline-electric"
              >
                <CalendarBlank aria-hidden="true" size={18} weight="bold" />
                Plan
              </Link>
              <ThemeToggle />
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
