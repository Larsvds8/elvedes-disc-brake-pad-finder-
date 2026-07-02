import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BASE_PATH } from "@/lib/padfinder";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Disc Brake Pad Finder | Elvedes",
  description:
    "Vind het juiste Elvedes-remblok voor je schijfrem: kies merk, serie en model, of zoek direct op OEM-artikelnummer.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className={inter.className}>
        <header className="site-header">
          <div className="site-header__inner">
            <a className="site-header__logo" href={`${BASE_PATH}/`} aria-label="Elvedes — home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${BASE_PATH}/elvedes-logo.png`} alt="Elvedes" width={132} height={44} />
            </a>
            <nav className="site-header__nav" aria-label="Hoofdnavigatie">
              <span className="site-header__navitem" aria-current="page">
                Disc Brake Pad Finder
              </span>
            </nav>
          </div>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <div className="site-footer__inner">
            <p className="site-footer__note">
              Officiële Elvedes-compatibiliteitsdata · vragen over een model dat ontbreekt?{" "}
              <a href="https://elvedes.nl" rel="noopener">
                elvedes.nl
              </a>
            </p>
            <p className="site-footer__copy">© {new Date().getFullYear()} Elvedes</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
