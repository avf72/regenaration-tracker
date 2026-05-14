import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Regeneration Tracker",
  description: "Maturaarbeit Thomas von Foerster – Schlafhygiene und Leistungsfähigkeit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f4f7f1]">
        <Nav />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="w-[min(1180px,calc(100%-32px))] mx-auto flex items-center gap-1 h-14">
        <span className="mr-4 font-black text-green-800 text-sm tracking-tight">Regeneration Tracker</span>
        {[
          { href: "/", label: "Reaktionstest" },
          { href: "/tagesprotokoll", label: "Tagesprotokoll" },
          { href: "/dashboard", label: "Dashboard" },
        ].map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="px-3 py-1.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-green-50 hover:text-green-800 transition-colors"
          >
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
