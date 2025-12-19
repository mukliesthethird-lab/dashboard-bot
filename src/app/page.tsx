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
          className="absolute w-1 h-1 bg-amber-500/30 rounded-full"
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
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 gradient-hero" />
        <FloatingParticles />

        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[120px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[100px] animate-float" />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-slide-down">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-gray-300">The #1 Discord Entertainment Bot</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight animate-slide-up">
            <span className="text-white">Make Your Server</span>
            <br />
            <span className="gradient-text-animated">COME ALIVE</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up animate-delay-200">
            The ultimate Discord bot with Economy, Fishing, Moderation, Welcome System,
            and Reaction Roles. Join thousands of servers already using Don Pollo!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up animate-delay-300">
            <a
              href={botInviteUrl}
              target="_blank"
              className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-lg transition-all duration-300 hover:scale-105 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 flex items-center gap-3"
            >
              <span className="text-2xl">🐔</span>
              <span>Add to Discord</span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>

            {session ? (
              <Link
                href="/dashboard"
                className="px-8 py-4 rounded-full glass text-white font-bold text-lg transition-all duration-300 hover:bg-white/10 flex items-center gap-2"
              >
                <span>Open Dashboard</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <button
                onClick={() => signIn("discord")}
                className="px-8 py-4 rounded-full glass text-white font-bold text-lg transition-all duration-300 hover:bg-white/10 flex items-center gap-2"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Login with Discord</span>
              </button>
            )}
          </div>


        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="relative py-24 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center p-6 glass-card rounded-2xl">
              <div className="stat-value">
                {loadingStats ? "..." : `${formatNumber(serversCounter.count)}`}
              </div>
              <div className="stat-label mt-2">Servers</div>
            </div>
            <div className="text-center p-6 glass-card rounded-2xl">
              <div className="stat-value">
                {loadingStats ? "..." : `${formatNumber(usersCounter.count)}`}
              </div>
              <div className="stat-label mt-2">Users</div>
            </div>
            <div className="text-center p-6 glass-card rounded-2xl">
              <div className="stat-value">
                {stats?.commands || 50}+
              </div>
              <div className="stat-label mt-2">Commands</div>
            </div>
            <div className="text-center p-6 glass-card rounded-2xl">
              <div className="stat-value">
                {stats?.uptime || "99.9%"}
              </div>
              <div className="stat-label mt-2">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              <span className="text-white">Everything You </span>
              <span className="gradient-text">Need</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              One bot, endless possibilities. Packed with features to make your server the best it can be.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="card-feature group"
                style={{ animationDelay: `${feature.delay}ms` }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="relative py-24 px-6">
        <div className="absolute inset-0 gradient-mesh opacity-30" />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Image/Visual */}
            <div className="relative flex justify-center">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/30 to-orange-500/30 rounded-full blur-3xl scale-150" />

                {/* Bot Avatar Card */}
                <div className="relative glass-card rounded-3xl p-8">
                  <img
                    src="/donpollo-icon.jpg"
                    alt="Don Pollo"
                    className="w-48 h-48 rounded-full border-4 border-amber-500/50 shadow-2xl mx-auto"
                  />

                  {/* Badges in a row below avatar */}
                  <div className="flex justify-center gap-3 mt-6">
                    <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-bold border border-emerald-500/30">
                      ✓ Verified
                    </span>
                    <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-full text-sm font-bold border border-amber-500/30">
                      ⚡ Fast
                    </span>
                    <span className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-full text-sm font-bold border border-purple-500/30">
                      🎮 Fun
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-4">
                <span className="text-white">Why Choose </span>
                <span className="gradient-text">Don Pollo?</span>
              </h2>
              <p className="text-gray-400 mb-8">
                Built with love for Discord communities. Here's what makes us different.
              </p>

              <div className="space-y-4">
                {[
                  { icon: "⚡", title: "Lightning Fast", desc: "Optimized for speed with minimal latency", color: "from-amber-500 to-orange-500" },
                  { icon: "🔒", title: "Secure & Reliable", desc: "99.9% uptime with robust security measures", color: "from-emerald-500 to-green-500" },
                  { icon: "🎨", title: "Fully Customizable", desc: "Configure everything to match your server's style", color: "from-purple-500 to-violet-500" },
                  { icon: "💬", title: "Active Support", desc: "Dedicated support team ready to help 24/7", color: "from-cyan-500 to-blue-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 glass-card p-4 rounded-xl group hover:scale-[1.02] transition-all">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{item.title}</h4>
                      <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-purple-500/10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/20 rounded-full blur-[150px]" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="text-7xl mb-8 animate-bounce-slow">🐔</div>

          <h2 className="text-4xl md:text-5xl font-black mb-6">
            <span className="text-white">Ready to </span>
            <span className="gradient-text">Level Up?</span>
          </h2>

          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Join thousands of servers already using Don Pollo. Setup takes less than 5 minutes!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={botInviteUrl}
              target="_blank"
              className="px-10 py-5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-lg transition-all duration-300 hover:scale-105 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 flex items-center gap-3"
            >
              <span>Get Started Free</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a
              href="https://bit.ly/bantengfam"
              target="_blank"
              className="px-10 py-5 rounded-full glass text-white font-bold text-lg transition-all duration-300 hover:bg-white/10 flex items-center gap-2"
            >
              <span>💬</span>
              <span>Join Support Server</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/donpollo-icon.jpg" alt="Don Pollo" className="w-12 h-12 rounded-full border-2 border-amber-500" />
                <span className="text-2xl font-black gradient-text">DON POLLO</span>
              </div>
              <p className="text-gray-400 max-w-sm">
                The most entertaining Discord bot with Economy, Fishing, Moderation, and more. Make your server come alive!
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Links</h4>
              <ul className="space-y-2">
                <li><Link href="/leaderboard" className="text-gray-400 hover:text-amber-500 transition">Leaderboard</Link></li>
                <li><a href={botInviteUrl} target="_blank" className="text-gray-400 hover:text-amber-500 transition">Invite Bot</a></li>
                <li><a href="https://bit.ly/bantengfam" target="_blank" className="text-gray-400 hover:text-amber-500 transition">Support Server</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-gray-400 hover:text-amber-500 transition">Privacy Policy</Link></li>
                <li><Link href="/tos" className="text-gray-400 hover:text-amber-500 transition">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} Don Pollo Bot. Made with ❤️ for Discord communities.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
