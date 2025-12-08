import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dashboard | Don Pollo",
  description: "The Best Economic & Moderation Bot on Discord",
  icons: {
    icon: '/donpollo-icon.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bgVideo = "https://media1.tenor.com/m/qCwbF4m0GpoAAAAd/don-pollo-don-pollo-dancing.gif";

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Navbar />
          <div className="relative min-h-screen text-slate-800 overflow-x-hidden font-sans">
            {/* Global Background Layer */}
            <div className="fixed inset-0 z-[-1]">
              {/* Fallback pattern */}
              <div className="absolute inset-0 bg-yellow-400 bg-[size:20px_20px]"
                style={{ backgroundImage: 'radial-gradient(circle, #ffffff 2px, transparent 2.5px)' }}>
              </div>

              {/* Don Pollo GIF */}
              <div
                className="absolute inset-0 bg-no-repeat bg-cover bg-center opacity-20 md:opacity-40 grayscale-[20%] sepia-[20%]"
                style={{ backgroundImage: `url('${bgVideo}')` }}
              />

              {/* Overlay for Color Tint & Readability - Yellowish Warm Tint */}
              <div className="absolute inset-0 bg-amber-50/80 backdrop-blur-[2px]"></div>
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
