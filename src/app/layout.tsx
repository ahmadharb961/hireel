import type { Metadata, Viewport } from "next";
import { Caveat, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { dirOf, resolveLocale } from "@/i18n/locales";
import { InstallBanner } from "@/components/InstallBanner";
import { NavProgress } from "@/components/NavProgress";
import { SwBridge } from "@/components/SwBridge";
import { SwRegister } from "@/components/SwRegister";
import "./globals.css";
import "./landing.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const hand = Caveat({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-hand", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-arabic", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  const locale = resolveLocale(await getLocale());
  const og = { url: "/brand/og.jpg", width: 1200, height: 630, alt: t("ogAlt") };
  return {
    metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
    title: { default: t("title"), template: "%s · Hireel" },
    description: t("description"),
    applicationName: "Hireel",
    keywords: ["Hireel", "video CV", "video resume", "jobs Lebanon", "hiring Lebanon", "jobs Dubai", "GCC jobs", "talent marketplace", "وظائف لبنان", "سيرة ذاتية بالفيديو"],
    openGraph: { type: "website", siteName: "Hireel", title: t("title"), description: t("description"), url: "/", locale: locale === "ar" ? "ar_LB" : "en_US", images: [og] },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description"), images: [og.url] },
    appleWebApp: { capable: true, title: "Hireel", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android: the keyboard shrinks the page instead of covering it (iPhone is handled in the chat).
  interactiveWidget: "resizes-content",
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
          <NavProgress />
          <SwBridge />
          {children}
          <InstallBanner />
          <SwRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
