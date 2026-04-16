import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./component/ThemeProvider";
import { Analytics } from "@vercel/analytics/react";

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
  metadataBase: new URL("https://wugweb.com"),
  description: "High-fidelity Personal Operating System & Neural RAG Matrix. A professional-grade OS for semantic memory and venture mapping.",
  keywords: ["Neural OS", "Identity Prism", "RAG", "Personal AI", "Venture Mapping", "Systems Architecture"],
  authors: [{ name: "Vedanshu Srivastava" }],
  creator: "Vedanshu Srivastava",
  publisher: "Vedanshu Srivastava",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://wugweb.com",
    siteName: "Identity Prism",
    title: "Identity Prism | Neural OS",
    description: "High-fidelity Personal Operating System & Neural RAG Matrix. A professional-grade OS for semantic memory and venture mapping.",
    images: [
      {
        url: "https://wugweb.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Identity Prism OS Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Identity Prism | Neural OS",
    description: "High-fidelity Personal Operating System & Neural RAG Matrix. A professional-grade OS for semantic memory and venture mapping.",
    images: ["https://wugweb.com/og-image.png"],
    creator: "@vedanshus",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
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
                  var theme = localStorage.getItem('theme');
                  var supportDark = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                  if (!theme && supportDark) theme = 'dark';
                  if (!theme) theme = 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrains.variable} font-sans`}>
        <ThemeProvider>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
