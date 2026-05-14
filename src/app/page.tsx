"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

const FEATURES = [
  { icon: "💰", title: "Economy System", description: "Complete economy with work, jobs, shops, and gambling. Build your fortune and compete with friends!" },
  { icon: "🎣", title: "Fishing Game", description: "Catch rare fish, upgrade rods, forge legendary equipment, and become the ultimate angler!" },
  { icon: "🛡️", title: "Moderation", description: "Auto-mod, comprehensive logging, warnings system, and advanced moderation tools." },
  { icon: "👋", title: "Welcome System", description: "Beautiful custom welcomes with embeds, buttons, images, and automatic role assignment." },
  { icon: "🎭", title: "Reaction Roles", description: "Easy self-role assignment with buttons, select menus, and reactions." },
  { icon: "📊", title: "Advanced Logging", description: "Track messages, voice activity, member changes, and server events in real-time." },
];

interface StatsData { servers: number; activeUsers: number; commands: number; uptime: string; }

function useCountUp(end: number, duration: number = 2000, start: number = 0) {
  const [count, setCount] = useState(start);
  const [hasStarted, setHasStarted] = useState(false);
  useEffect(() => {
    if (!hasStarted) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * (end - start) + start));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start, hasStarted]);
  return { count, start: () => setHasStarted(true) };
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

export default function Home() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const statsRef = useRef<HTMLElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  const serversCounter = useCountUp(stats?.servers || 0, 2000);
  const usersCounter = useCountUp(stats?.activeUsers || 0, 2000);

  useEffect(() => {
    setMounted(true);
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => { setStats(data); setLoadingStats(false); })
      .catch(() => { setStats({ servers: 10, activeUsers: 1000, commands: 50, uptime: "99.9%" }); setLoadingStats(false); });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !statsVisible) { setStatsVisible(true); serversCounter.start(); usersCounter.start(); } },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [statsVisible, serversCounter, usersCounter]);

  if (!mounted) return null;

  const botInviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1257064052203458712'}&permissions=8&scope=bot%20applications.commands`;

  return (
    <div className="relative min-h-screen text-white font-sans flex flex-col">
      {/* Subtle Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(88,101,242,0.12),transparent)]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 min-h-[75vh] flex flex-col items-center justify-center pt-16 pb-12 px-6">
        <div className="max-w-4xl mx-auto w-full text-center flex flex-col items-center">

          {/* Badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] mb-8">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-[var(--text-secondary)]">Don Pollo v2.0 is Live</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-extrabold mb-5 leading-[1.05] tracking-tight animate-fade-up" style={{ animationDelay: '80ms' }}>
            <span className="text-white">Make Your</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] to-[#a855f7]">
              Server Alive
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 font-medium leading-relaxed animate-fade-up" style={{ animationDelay: '160ms' }}>
            The ultimate Discord bot equipped with Economy, Moderation, and Welcome Systems.
            Ditch the clutter. Build a premium community today.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto animate-fade-up" style={{ animationDelay: '240ms' }}>
            <a
              href={botInviteUrl}
              target="_blank"
              className="group w-full sm:w-auto px-6 py-3 rounded-lg bg-[var(--accent)] text-white font-semibold text-base transition-all hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-[var(--accent-glow)] flex items-center justify-center gap-2.5"
            >
              <span className="text-xl">🐔</span>
              <span>Add to Discord</span>
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>

            {session ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[var(--bg-secondary)] text-white font-semibold text-base border border-[var(--border)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)] transition-all flex items-center justify-center gap-2"
              >
                Dashboard
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <button
                onClick={() => signIn("discord")}
                className="group w-full sm:w-auto px-6 py-3 rounded-lg bg-[var(--bg-secondary)] text-white font-semibold text-base border border-[var(--border)] hover:bg-[#5865F2] hover:border-[#5865F2] transition-all flex items-center justify-center gap-2.5"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Login with Discord
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="relative z-20 px-6 -mt-8 mb-12">
        <div className="max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: '320ms' }}>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6 md:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {[
                { label: "Active Servers", value: loadingStats ? "..." : formatNumber(serversCounter.count), color: "text-[var(--accent)]" },
                { label: "Global Users", value: loadingStats ? "..." : formatNumber(usersCounter.count), color: "text-purple-400" },
                { label: "Commands", value: `${stats?.commands || "50"}+`, color: "text-emerald-400" },
                { label: "Uptime", value: stats?.uptime || "99.9%", color: "text-amber-400" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className={`text-3xl md:text-4xl font-bold text-white mb-1 tabular-nums`}>{stat.value}</div>
                  <div className={`text-xs font-semibold uppercase tracking-wider ${stat.color}`}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 animate-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
              Everything You <span className="gradient-text">Need</span>
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              One bot, endless possibilities. Packed with features to make your server the best it can be.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)] transition-all duration-200">
                <div className="w-8 h-8 text-sm rounded-lg bg-[var(--bg-hover)] flex items-center justify-center text-xl mb-3">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">{feature.title}</h3>
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(88,101,242,0.08),transparent_60%)]" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-white">
                Enter the Next Generation.
              </h2>
              <p className="text-[var(--text-secondary)] max-w-lg mx-auto mb-8">
                Setup takes exactly 45 seconds. No credit card, no complex commands. Just pure execution.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={botInviteUrl}
                  target="_blank"
                  className="px-6 py-3 rounded-lg bg-[var(--accent)] text-white font-semibold transition-all hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-[var(--accent-glow)] flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <span>⚡</span>
                  <span>Instant Setup</span>
                </a>
                <a
                  href="https://bit.ly/bantengfam"
                  target="_blank"
                  className="px-6 py-3 rounded-lg bg-[var(--bg-tertiary)] text-white font-semibold border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] w-full sm:w-auto justify-center text-center transition-all"
                >
                  Join Community
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-auto py-12 px-6 border-t border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-10 text-sm">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <img src="/donpollo-icon.jpg" alt="Don Pollo" className="w-8 h-8 rounded-lg border border-[var(--border)]" />
              <span className="text-base font-bold text-white">DON POLLO</span>
            </div>
            <p className="text-[var(--text-secondary)] max-w-xs leading-relaxed text-sm">
              Premium management, economy, and utility for the modern Discord era.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2.5">
              <li><Link href="/dashboard" className="text-[var(--text-secondary)] hover:text-white transition-colors text-sm">Dashboard</Link></li>
              <li><Link href="/leaderboard" className="text-[var(--text-secondary)] hover:text-white transition-colors text-sm">Leaderboard</Link></li>
              <li><Link href="/commands" className="text-[var(--text-secondary)] hover:text-white transition-colors text-sm">Commands</Link></li>
              <li><Link href="/status" className="text-[var(--text-secondary)] hover:text-white transition-colors text-sm">System Status</Link></li>
              <li><Link href="/donate" className="text-[var(--text-secondary)] hover:text-amber-400 transition-colors text-sm">☕ Donate</Link></li>
              <li><a href="https://bit.ly/bantengfam" className="text-[var(--text-secondary)] hover:text-white transition-colors text-sm">Support</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2.5">
              <li><Link href="/privacy" className="text-[var(--text-secondary)] hover:text-white transition-colors text-sm">Privacy Policy</Link></li>
              <li><Link href="/tos" className="text-[var(--text-secondary)] hover:text-white transition-colors text-sm">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-[var(--border)] text-[var(--text-tertiary)] text-xs">
          <p>© {new Date().getFullYear()} Don Pollo Bot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
