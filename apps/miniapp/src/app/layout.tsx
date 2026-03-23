import type { ReactNode } from "react";
import Script from "next/script";

import "./globals.css";
import { TelegramSafeArea } from "../components/telegram-safe-area";

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js?61" strategy="beforeInteractive" />
        <TelegramSafeArea />
        {children}
      </body>
    </html>
  );
}
