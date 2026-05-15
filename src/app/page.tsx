"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

const FEATURES = [
  {
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    title: "Global Economy",
    description: "A robust financial ecosystem with sophisticated jobs, market trading, and secure banking—completely free from paywalls."
  },
  {
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 01-6.001 0M18 7l-3 9m3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>,
    title: "Advanced Moderation",
    description: "Enterprise-grade protection with automated filtering, behavioral analysis, and seamless management tools for communities of any size."
  },
  {
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    title: "Real-time Engagement",
    description: "Drive server activity with interactive games like Fishing and Casino, designed to keep your community vibrant and connected."
  },
  {
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    title: "Smart Onboarding",
    description: "Create the perfect first impression with automated welcome sequences, role assignment, and immersive embed messaging."
  },
  {
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    title: "Insightful Analytics",
    description: "Deep dive into your server's health with comprehensive logging and growth tracking metrics available at your fingertips."
  },
  {
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    title: "Seamless Integration",
    description: "Powerful web dashboard for instant configuration. Manage your entire Discord ecosystem without typing a single command."
  },
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
      .catch(() => { setStats({ servers: 1240, activeUsers: 84200, commands: 120, uptime: "99.99%" }); setLoadingStats(false); });
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
    <div className="relative min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex flex-col overflow-x-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-6">
        <div className="max-w-5xl mx-auto w-full text-center flex flex-col items-center">



          {/* Main Heading */}
          <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[1] tracking-tighter animate-fade-up" style={{ animationDelay: '80ms' }}>
            Elevate Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-[var(--text-primary)] to-[var(--text-primary)]/40">
              Discord Experience.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-[var(--text-primary)]/50 max-w-2xl mx-auto mb-12 font-medium leading-relaxed animate-fade-up" style={{ animationDelay: '160ms' }}>
            Professional management, global economy, and interactive utility.
            The first truly premium bot designed for everyone, <span className="text-[var(--text-primary)]">completely free from paywalls.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto animate-fade-up" style={{ animationDelay: '240ms' }}>
            <a
              href={botInviteUrl}
              target="_blank"
              className="group w-full sm:w-auto px-10 py-4 rounded-2xl bg-[var(--accent)] text-[var(--text-primary)] font-black text-sm uppercase tracking-widest transition-all hover:bg-[var(--accent-hover)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_0_40px_var(--accent-glow)]"
            >
              <span>Add to Discord</span>
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>

            {session ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-black text-sm uppercase tracking-widest border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-all flex items-center justify-center gap-3 backdrop-blur-md"
              >
                Dashboard
              </Link>
            ) : (
              <button
                onClick={() => signIn("discord")}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-black text-sm uppercase tracking-widest border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-all flex items-center justify-center gap-3 backdrop-blur-md"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Floating Visual Element (Mock Dashboard Preview) */}
        <div className="mt-20 w-full max-w-5xl px-4 animate-fade-up" style={{ animationDelay: '400ms' }}>
          <div className="relative rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] p-2 backdrop-blur-2xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />
            <img
              src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop"
              alt="Dashboard Preview"
              className="rounded-2xl opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700 w-full h-[300px] md:h-[500px] object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[var(--bg-tertiary)]/60 backdrop-blur-md border border-[var(--border)] p-6 rounded-3xl text-center max-w-xs shadow-2xl">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h4 className="text-[var(--text-primary)] font-black text-sm uppercase tracking-widest mb-2">Secure Connection</h4>
                <p className="text-[var(--text-primary)]/40 text-[11px] font-medium leading-relaxed">OAuth2 verified integration. Your server security is our highest priority.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="relative z-20 px-6 py-24 border-y border-[var(--border)] bg-[var(--bg-tertiary)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { label: "Active Servers", value: loadingStats ? "..." : formatNumber(serversCounter.count), color: "text-blue-500" },
              { label: "Global Users", value: loadingStats ? "..." : formatNumber(usersCounter.count), color: "text-purple-500" },
              { label: "API Commands", value: `${stats?.commands || "120"}+`, color: "text-emerald-500" },
              { label: "Network Uptime", value: stats?.uptime || "99.9%", color: "text-amber-500" },
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className={`text-4xl md:text-6xl font-black text-[var(--text-primary)] mb-2 tabular-nums group-hover:scale-105 transition-transform duration-500`}>{stat.value}</div>
                <div className={`text-[10px] font-black uppercase tracking-[0.3em] ${stat.color} opacity-70`}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter">
                Everything. <br />
                <span className="text-[var(--text-primary)]/30">Zero Compromise.</span>
              </h2>
              <p className="text-lg text-[var(--text-primary)]/50 font-medium">
                We've combined all the essential tools your community needs into one seamless, high-performance bot.
              </p>
            </div>
            <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]/40">Powered by</span>
              <span className="text-xs font-black text-[var(--text-primary)]">VEXYHOST</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className="group p-10 rounded-[40px] bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--bg-hover)] transition-all duration-500 flex flex-col h-full">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] mb-8 group-hover:scale-110 group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:text-[var(--text-primary)] transition-all duration-500 shadow-2xl">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black text-[var(--text-primary)] mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-[var(--text-primary)]/40 text-sm leading-relaxed font-medium flex-1">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-[var(--border)] rounded-[60px] p-12 md:p-24 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_70%)]" />
            <div className="relative z-10">
              <h2 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter text-[var(--text-primary)]">
                Ready for the <br />
                New Standard?
              </h2>
              <p className="text-xl text-[var(--text-primary)]/50 max-w-xl mx-auto mb-16 font-medium leading-relaxed">
                Experience the difference of a bot that puts community quality over monetization. Setup in under 60 seconds.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <a
                  href={botInviteUrl}
                  target="_blank"
                  className="px-12 py-5 rounded-3xl bg-white text-black font-black text-xs uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 flex items-center gap-3 w-full sm:w-auto justify-center shadow-2xl"
                >
                  Get Started
                </a>
                <a
                  href="https://bit.ly/bantengfam"
                  target="_blank"
                  className="px-12 py-5 rounded-3xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-black text-xs uppercase tracking-[0.3em] border border-[var(--border)] hover:bg-[var(--bg-hover)] w-full sm:w-auto justify-center text-center transition-all backdrop-blur-md"
                >
                  Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-auto py-24 px-6 border-t border-[var(--border)] bg-[var(--bg-tertiary)]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-20">
          <div className="md:col-span-2 space-y-8">
            <div className="flex items-center gap-4">
              <img src="/donpollo-icon.jpg" alt="Don Pollo" className="w-12 h-12 rounded-2xl border border-[var(--border)] shadow-2xl" />
              <div className="flex flex-col">
                <span className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">DON POLLO</span>
                <span className="text-[9px] font-black text-[var(--text-primary)]/30 uppercase tracking-[0.4em]">Premium Evolution</span>
              </div>
            </div>
            <p className="text-[var(--text-primary)]/40 max-w-sm leading-relaxed text-sm font-medium">
              We are redefining what it means to be a "Premium" Discord bot.
              No paywalls, no tiered features. Just professional tools for everyone.
            </p>
          </div>
          <div>
            <h4 className="font-black text-[var(--text-primary)] mb-8 text-[10px] uppercase tracking-[0.3em]">Resources</h4>
            <ul className="space-y-4">
              <li><Link href="/dashboard" className="text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors text-xs font-bold uppercase tracking-widest">Dashboard</Link></li>
              <li><Link href="/leaderboard" className="text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors text-xs font-bold uppercase tracking-widest">Leaderboard</Link></li>
              <li><Link href="/commands" className="text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors text-xs font-bold uppercase tracking-widest">Commands</Link></li>
              <li><Link href="/status" className="text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors text-xs font-bold uppercase tracking-widest">System</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-[var(--text-primary)] mb-8 text-[10px] uppercase tracking-[0.3em]">Legal</h4>
            <ul className="space-y-4">
              <li><Link href="/privacy" className="text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors text-xs font-bold uppercase tracking-widest">Privacy</Link></li>
              <li><Link href="/tos" className="text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors text-xs font-bold uppercase tracking-widest">Terms</Link></li>
              <li><Link href="/donate" className="text-amber-500/60 hover:text-amber-400 transition-colors text-xs font-bold uppercase tracking-widest">Donate</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-24 pt-12 border-t border-[var(--border)] flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[var(--text-primary)]/20 text-[10px] font-black uppercase tracking-[0.2em]">© {new Date().getFullYear()} Don Pollo Bot. Engineered for Excellence.</p>
          <div className="flex gap-8">
            <a href="#" className="text-[var(--text-primary)]/20 hover:text-[var(--text-primary)] transition-colors"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg></a>
            <a href="#" className="text-[var(--text-primary)]/20 hover:text-[var(--text-primary)] transition-colors"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
