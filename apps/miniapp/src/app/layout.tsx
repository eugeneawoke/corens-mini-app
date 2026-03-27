import type { ReactNode } from "react";
import type { Viewport } from "next";
import { Caveat } from "next/font/google";
import Script from "next/script";

import "./globals.css";
import { TelegramSafeArea } from "../components/telegram-safe-area";

const caveat = Caveat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-handwritten"
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru" className={caveat.variable}>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js?61" strategy="beforeInteractive" />
        <TelegramSafeArea />
        {children}
      </body>
    </html>
  );
}
