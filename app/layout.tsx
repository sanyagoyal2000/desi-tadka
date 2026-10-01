import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["600", "700", "800"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DesiTadka",
  description: "Turn Western fitness reels into recipes and workouts that fit Indian kitchens.",
};

export const viewport: Viewport = { themeColor: "#D9480F", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${baloo.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-16">
          <header className="flex items-center justify-between py-5">
            <Link href="/" className="font-display text-3xl font-extrabold leading-none text-chili">
              Desi<span className="text-turmeric">Tadka</span>
            </Link>
            <span className="text-xs font-medium text-ink/60">reels → real food</span>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
