"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const botInviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1257064052203458712'}&permissions=8&scope=bot%20applications.commands`;

  return (
    <div className="min-h-screen">
      {/* Navbar handled in Layout */}

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 px-6 text-center">
        <div className="max-w-4xl mx-auto backdrop-blur-sm bg-white/60 p-8 md:p-12 rounded-[3rem] shadow-xl border-4 border-white/80 ring-1 ring-amber-100">
          <div className="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-bold mb-8 shadow-sm tracking-wide uppercase">
            ✨ The #1 Economy Bot
          </div>

          <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 text-stone-800 drop-shadow-sm">
            Make Your Server <br />
            <span className="text-amber-500">
              COME ALIVE
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-stone-600 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Join the party with the most entertaining Economy, Fishing, and Moderation bot on Discord!
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <a
              href={botInviteUrl}
              target="_blank"
              className="w-full md:w-auto px-10 py-5 rounded-full bg-amber-400 hover:bg-amber-500 text-stone-900 font-black text-xl transition shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transform hover:scale-105"
            >
              <span>INVITE DON POLLO</span>
            </a>
            <Link
              href="/leaderboard"
              className="w-full md:w-auto px-10 py-5 rounded-full bg-white text-stone-800 font-black text-xl border-2 border-stone-200 hover:border-amber-400 hover:text-amber-600 transition shadow-lg flex items-center justify-center"
            >
              LEADERBOARD
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-stone-500 text-sm font-medium bg-amber-50/60 backdrop-blur-md border-t border-amber-100">
        <p>&copy; {new Date().getFullYear()} Don Pollo Bot. Let's Party!</p>
      </footer>
    </div>
  );
}
