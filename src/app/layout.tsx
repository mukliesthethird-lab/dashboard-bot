import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";


export const metadata: Metadata = {
  title: {
    default: "Don Pollo | Premium Bot",
    template: "%s | Don Pollo"
  },
  description: "Professional Discord management, global economy, and interactive systems—completely free. Don Pollo provides a premium experience without the paywall.",
  keywords: ["discord bot", "economy bot", "fishing bot", "moderation bot", "welcome bot", "reaction roles", "don pollo"],
  authors: [{ name: "Don Pollo Team" }],
  creator: "Don Pollo",
  publisher: "Don Pollo",
  robots: "index, follow",
  icons: {
    icon: '/donpollo-icon.jpg',
    apple: '/donpollo-icon.jpg',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://donpollo.gg",
    siteName: "Don Pollo Bot",
    title: "Don Pollo | Premium Bot",
    description: "Professional Discord management, global economy, and interactive systems—completely free.",
    images: [
      {
        url: "/donpollo-icon.jpg",
        width: 512,
        height: 512,
        alt: "Don Pollo Bot"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Don Pollo | Premium Bot",
    description: "Professional Discord management, global economy, and interactive systems—completely free.",
    images: ["/donpollo-icon.jpg"],
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://donpollo.gg"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <AuthProvider>
          <Navbar />
          <div className="relative">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
