import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./component/ThemeProvider";
import { ChunkReloadGuard } from "./component/ChunkReloadGuard";
import { CaptureSyncStatus } from "./component/CaptureSyncStatus";
import { ServiceWorkerRegister } from "./component/ServiceWorkerRegister";
import { InstallPrompt } from "./component/InstallPrompt";
import { ConnectivityToast } from "./component/ConnectivityToast";
import { Analytics } from "@vercel/analytics/next";
import { IDENTITY_CONFIG } from "@/config/identity";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Identity Prism | Neural OS",
  metadataBase: new URL(IDENTITY_CONFIG.SITE_URL),
  description: "High-fidelity Personal Operating System & Neural RAG Matrix. A professional-grade OS for semantic memory and venture mapping.",
  keywords: ["Neural OS", "Identity Prism", "RAG", "Personal AI", "Venture Mapping", "Systems Architecture"],
  authors: [{ name: IDENTITY_CONFIG.DISPLAY_NAME }],
  creator: IDENTITY_CONFIG.DISPLAY_NAME,
  publisher: IDENTITY_CONFIG.DISPLAY_NAME,
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: IDENTITY_CONFIG.SITE_URL,
    siteName: IDENTITY_CONFIG.SITE_NAME,
    title: "Identity Prism | Neural OS",
    description: "High-fidelity Personal Operating System & Neural RAG Matrix. A professional-grade OS for semantic memory and venture mapping.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Identity Prism, a personal cognitive operating system",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Identity Prism | Neural OS",
    description: "High-fidelity Personal Operating System & Neural RAG Matrix. A professional-grade OS for semantic memory and venture mapping.",
    images: [{ url: "/og-image.png", alt: "Identity Prism, a personal cognitive operating system" }],
    creator: IDENTITY_CONFIG.X_HANDLE,
  },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Prism OS", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // The app is light-only (data-theme is forced to light), so both schemes use the porcelain surface.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F0" },
    { media: "(prefers-color-scheme: dark)", color: "#F5F5F0" },
  ],
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // Android Chrome resizes the layout when the keyboard opens, so fixed bars stay above it.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.setAttribute('data-theme', 'light');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrains.variable} font-sans`}>
        <ThemeProvider>
          <ChunkReloadGuard />
          <ServiceWorkerRegister />
          <ConnectivityToast />
          <CaptureSyncStatus />
          {children}
          <InstallPrompt />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
