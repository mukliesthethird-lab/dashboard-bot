"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

const FEATURES = [
  {
    icon: "💰",
    title: "Economy System",
    description: "Complete economy with work, jobs, shops, and gambling. Build your fortune and compete with friends!",
    gradient: "from-amber-500 to-orange-500",
    delay: "0"
  },
  {
    icon: "🎣",
    title: "Fishing Game",
    description: "Catch rare fish, upgrade rods, forge legendary equipment, and become the ultimate angler!",
    gradient: "from-cyan-500 to-blue-500",
    delay: "100"
  },
  {
    icon: "🛡️",
    title: "Moderation",
    description: "Auto-mod, comprehensive logging, warnings system, and advanced moderation tools to keep your server safe.",
    gradient: "from-red-500 to-rose-500",
    delay: "200"
  },
  {
    icon: "👋",
    title: "Welcome System",
    description: "Beautiful custom welcomes with embeds, buttons, images, and automatic role assignment.",
    gradient: "from-emerald-500 to-green-500",
    delay: "300"
  },
  {
    icon: "🎭",
    title: "Reaction Roles",
    description: "Easy self-role assignment with buttons, select menus, and reactions. Fully customizable!",
    gradient: "from-purple-500 to-violet-500",
    delay: "400"
  },
  {
    icon: "📊",
    title: "Advanced Logging",
    description: "Track everything - messages, voice activity, member changes, and server events in beautiful embeds.",
    gradient: "from-slate-500 to-zinc-500",
    delay: "500"
  }
];

const STATS = [
  { key: "servers", label: "Servers", suffix: "+" },
  { key: "users", label: "Users", suffix: "+" },
  { key: "commands", label: "Commands", suffix: "" },
  { key: "uptime", label: "Uptime", suffix: "" }
];

interface StatsData {
  servers: number;
  activeUsers: number;
  commands: number;
  uptime: string;
}

// Animated counter hook
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
      if (progress < 1) {
        requestAnimationFrame(step);
      }
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

// Floating particles component
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-indigo-500/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `particle-float ${10 + Math.random() * 10}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`
          }}
        />
      ))}
    </div>
  );
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
      .then(data => {
        setStats(data);
        setLoadingStats(false);
      })
      .catch(() => {
        setStats({ servers: 10, activeUsers: 1000, commands: 50, uptime: "99.9%" });
        setLoadingStats(false);
      });
  }, []);

  // Intersection observer for stats section
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !statsVisible) {
          setStatsVisible(true);
          serversCounter.start();
          usersCounter.start();
        }
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, [statsVisible, serversCounter, usersCounter]);

  if (!mounted) return null;

  const botInviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1257064052203458712'}&permissions=8&scope=bot%20applications.commands`;

  return (
    <div className="relative min-h-screen bg-[#030305] text-white selection:bg-indigo-500/30 font-sans flex flex-col">
      {/* Dynamic Aurora Background System */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100px,#1e1b4b,transparent)]" />
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vh] bg-indigo-600/20 blur-[120px] rounded-full animate-aurora mix-blend-screen" />
        <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[80vh] bg-fuchsia-600/15 blur-[120px] rounded-full animate-aurora mix-blend-screen" style={{ animationDelay: '2s', animationDuration: '25s' }} />
        <div className="absolute bottom-[-10%] left-[10%] w-[60vw] h-[60vh] bg-emerald-600/10 blur-[120px] rounded-full animate-aurora mix-blend-screen" style={{ animationDelay: '5s', animationDuration: '30s' }} />
        {/* Subtle dot matrix overlay */}
        <div className="absolute inset-0 opactiy-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <FloatingParticles />

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-16 px-6">
        <div className="max-w-6xl mx-auto w-full text-center flex flex-col items-center">

          {/* Top Badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-white/10 mb-8 hover:border-indigo-500/50 transition-colors shadow-[0_0_30px_rgba(99,102,241,0.2)]">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-semibold text-gray-300">Don Pollo v2.0 is Live</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-6xl md:text-8xl lg:text-[8rem] font-black mb-6 leading-[0.9] tracking-tighter animate-fade-up" style={{ animationDelay: '100ms' }}>
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              MAKE YOUR
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-400 animate-gradient-x drop-shadow-[0_0_40px_rgba(99,102,241,0.3)]">
              SERVER ALIVE
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-gray-400/90 max-w-3xl mx-auto mb-12 font-medium leading-relaxed animate-fade-up" style={{ animationDelay: '200ms' }}>
            The ultimate neo-bot equipped with Economy, Moderation, and Welcome Systems.
            Ditch the clutter. Build a premium community today.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto animate-fade-up" style={{ animationDelay: '300ms' }}>
            <a
              href={botInviteUrl}
              target="_blank"
              className="group relative w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-black text-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 via-white to-fuchsia-100 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 text-2xl">🐔</span>
              <span className="relative z-10">Add to Discord</span>
              <svg className="w-6 h-6 relative z-10 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>

            {session ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-full glass-card text-white font-bold text-lg transition-all duration-300 hover:bg-white/10 flex items-center justify-center gap-2 border border-white/10"
              >
                <span>Dashboard</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <button
                onClick={() => signIn("discord")}
                className="group w-full sm:w-auto px-8 py-4 rounded-full glass text-white font-bold text-lg transition-all duration-300 hover:bg-[#5865F2] hover:border-[#5865F2] hover:shadow-[0_0_30px_rgba(88,101,242,0.4)] flex items-center justify-center gap-3 border border-white/10"
              >
                <svg className="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Login with Discord</span>
              </button>
            )}
          </div>
        </div>
      </section>


      {/* Trust & Stats Section */}
      <section ref={statsRef} className="relative z-20 px-6 -mt-10 mb-20">
        <div className="max-w-6xl mx-auto relative animate-fade-up" style={{ animationDelay: '400ms' }}>
          
          <div className="relative glass-card bg-[#0a0a0f]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(168,85,247,0.1)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 divide-x-0 md:divide-x divide-white/5">
              
              <div className="text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <div className="text-4xl md:text-5xl font-black text-white mb-2 font-mono tracking-tight drop-shadow-md">
                  {loadingStats ? "..." : `${formatNumber(serversCounter.count)}`}
                </div>
                <div className="text-xs md:text-sm text-indigo-400 font-bold uppercase tracking-[0.2em]">Active Servers</div>
              </div>

              <div className="text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <div className="text-4xl md:text-5xl font-black text-white mb-2 font-mono tracking-tight drop-shadow-md">
                  {loadingStats ? "..." : `${formatNumber(usersCounter.count)}`}
                </div>
                <div className="text-xs md:text-sm text-purple-400 font-bold uppercase tracking-[0.2em]">Global Users</div>
              </div>

              <div className="text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="text-4xl md:text-5xl font-black text-white mb-2 font-mono tracking-tight drop-shadow-md">
                  {stats?.commands || "50"}+
                </div>
                <div className="text-xs md:text-sm text-emerald-400 font-bold uppercase tracking-[0.2em]">Commands</div>
              </div>

              <div className="text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div className="text-4xl md:text-5xl font-black text-white mb-2 font-mono tracking-tight drop-shadow-md">
                  {stats?.uptime || "99.9%"}
                </div>
                <div className="text-xs md:text-sm text-amber-400 font-bold uppercase tracking-[0.2em]">Uptime</div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Bento Box Features Section */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-up">
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
              Everything You <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Need</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              One bot, endless possibilities. Packed with features to make your server the best it can be.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => {
              let bgColor = 'bg-gray-800';
              if (feature.gradient.includes('amber')) bgColor = 'bg-orange-500';
              else if (feature.gradient.includes('cyan')) bgColor = 'bg-blue-400';
              else if (feature.gradient.includes('red')) bgColor = 'bg-rose-500';
              else if (feature.gradient.includes('emerald')) bgColor = 'bg-emerald-500';
              else if (feature.gradient.includes('purple')) bgColor = 'bg-violet-500';
              else if (feature.gradient.includes('slate')) bgColor = 'bg-slate-500';

              return (
                <div key={idx} className="p-8 rounded-3xl bg-[#111214] border border-white/5 hover:border-white/10 transition-colors">
                  <div className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center text-2xl mb-6 shadow-lg`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400 text-[15px] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="glass-heavy rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden border border-indigo-500/20">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-fuchsia-500/10" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/30 rounded-full blur-[100px]" />

            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-white">
                Enter the Next Generation.
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
                Setup takes exactly 45 seconds. No credit card, no complex commands.
                Just pure execution.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={botInviteUrl}
                  target="_blank"
                  className="px-10 py-5 rounded-full bg-white text-black font-black text-lg transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center gap-3 w-full sm:w-auto justify-center"
                >
                  <span className="text-2xl">⚡</span>
                  <span>Instant Setup</span>
                </a>
                <a
                  href="https://bit.ly/bantengfam"
                  target="_blank"
                  className="px-10 py-5 rounded-full bg-[#1e1e24] text-white font-bold text-lg transition-all border border-white/10 hover:border-white/30 hover:bg-white/5 w-full sm:w-auto justify-center text-center"
                >
                  Join Community
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-auto py-16 px-6 border-t border-white/5 bg-[#010102]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 text-sm">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <img src="/donpollo-icon.jpg" alt="Don Pollo" className="w-10 h-10 rounded-full border border-white/20" />
              <span className="text-xl font-black tracking-widest text-white">DON POLLO</span>
            </div>
            <p className="text-gray-400 max-w-sm leading-relaxed">
              Premium management, economy, and utility for the modern Discord era. Built by developers who actually use Discord.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-6 tracking-widest uppercase">Platform</h4>
            <ul className="space-y-4">
              <li><Link href="/dashboard" className="text-gray-400 hover:text-indigo-400 transition-colors">Dashboard</Link></li>
              <li><Link href="/leaderboard" className="text-gray-400 hover:text-indigo-400 transition-colors">Leaderboard</Link></li>
              <li><Link href="/commands" className="text-gray-400 hover:text-indigo-400 transition-colors">Commands Wiki</Link></li>
              <li><Link href="/status" className="text-gray-400 hover:text-indigo-400 transition-colors">System Status</Link></li>
              <li><Link href="/donate" className="text-gray-400 hover:text-amber-400 transition-colors font-bold flex items-center gap-2"><span>☕</span> Donate to Creator</Link></li>
              <li><a href="https://bit.ly/bantengfam" className="text-gray-400 hover:text-indigo-400 transition-colors">Support</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-6 tracking-widest uppercase">Legal</h4>
            <ul className="space-y-4">
              <li><Link href="/privacy" className="text-gray-400 hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/tos" className="text-gray-400 hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-gray-500">
          <p>© {new Date().getFullYear()} Don Pollo Bot. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <span className="flex items-center gap-2">
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
