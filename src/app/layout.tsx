import type { Metadata, Viewport } from "next";
import { Caveat, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { dirOf, resolveLocale } from "@/i18n/locales";
import { InstallBanner } from "@/components/InstallBanner";
import { SwRegister } from "@/components/SwRegister";
import "./globals.css";
import "./landing.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const hand = Caveat({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-hand", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-arabic", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: "Hireel", template: "%s · Hireel" },
    description: t("description"),
    applicationName: "Hireel",
    appleWebApp: { capable: true, title: "Hireel", statusBarStyle: "default" },
    icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a16" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = resolveLocale(await getLocale());
  return (
    <html lang={locale} dir={dirOf(locale)} className={`${inter.variable} ${arabic.variable} ${hand.variable}`}>
      <body>
        <NextIntlClientProvider>
          {children}
          <InstallBanner />
          <SwRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
