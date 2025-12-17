import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Don Pollo | The Best Discord Bot",
    template: "%s | Don Pollo"
  },
  description: "The most entertaining Discord bot with Economy, Fishing, Moderation, Welcome System, and Reaction Roles. Join thousands of servers already using Don Pollo!",
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
    title: "Don Pollo | The Best Discord Bot",
    description: "The most entertaining Discord bot with Economy, Fishing, Moderation, and more!",
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
    title: "Don Pollo | The Best Discord Bot",
    description: "The most entertaining Discord bot with Economy, Fishing, Moderation, and more!",
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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0f] text-white antialiased`}>
        <AuthProvider>
          <Navbar />
          <div className="relative min-h-screen overflow-x-hidden">
            {/* Clean dark background - no distracting patterns */}
            <div className="fixed inset-0 z-[-1] bg-[#0a0a0f]">
              {/* Subtle gradient mesh for depth */}
              <div className="absolute inset-0 gradient-mesh opacity-30" />
            </div>

            {/* Main Content */}
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
