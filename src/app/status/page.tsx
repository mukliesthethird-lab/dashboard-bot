"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Shard {
  id: number;
  status: string;
  latency: string;
  servers: number;
  users: number;
}

interface UptimeHistory {
  check_date: string;
  uptime_percentage: number;
  incident_count: number;
}

interface StatusData {
  status: string;
  version: string;
  uptime: string;
  latency: string;
  shards: Shard[];
  clusters: number;
  memoryUsage: string;
  lastUpdate: string;
  totalServers?: number;
  totalUsers?: number;
  history?: UptimeHistory[];
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const json = await res.json();
        setData(json);
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate Average Availability
  const avgAvailability = data?.history && data.history.length > 0
    ? (data.history.reduce((acc, curr) => acc + Number(curr.uptime_percentage), 0) / data.history.length).toFixed(2)
    : "100.00";

  return (
    // ... (Background and Header remain the same)
    <div className="relative min-h-screen bg-[#030305] text-white pt-32 pb-24 px-6 overflow-x-hidden">
      {/* Background System */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-indigo-600/10 blur-[130px] rounded-full animate-aurora" />
        <div className="absolute bottom-0 right-[-10%] w-[60vw] h-[60vh] bg-emerald-600/10 blur-[130px] rounded-full animate-aurora" style={{ animationDelay: '5s' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8 animate-fade-up">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">
                Live System Metrics
              </div>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent" />
            </div>
            <h1 className="text-6xl font-black tracking-tighter leading-none mb-4">
              SYSTEM <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">STATUS</span>
            </h1>
            <p className="text-gray-400 font-medium max-w-xl">
              Real-time monitoring of Don Pollo's infrastructure. Data is updated every 5 seconds directly from the system core.
            </p>
          </div>
        </div>

        {/* Global Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16 animate-fade-up animate-delay-100">
           <StatCard 
             label="Current Latency" 
             value={data?.latency || "0ms"} 
             sub="Ping time to gateway" 
             color="indigo"
             icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
           />
           <StatCard 
             label="System Uptime" 
             value={data?.uptime || "0d 0h"} 
             sub="Since last deployment" 
             color="emerald"
             icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
           />
           <StatCard 
             label="Total Servers" 
             value={data?.totalServers?.toLocaleString() || "0"} 
             sub="Across all shards" 
             color="purple"
             icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
           />
           <StatCard 
             label="Memory Usage" 
             value={data?.memoryUsage.split(' / ')[0] || "0MB"} 
             sub="Resource consumption" 
             color="amber"
             icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>}
           />
        </div>

        {/* Uptime History Bar */}
        <div className="glass-card p-10 rounded-[3rem] border border-white/5 mb-8 animate-fade-up animate-delay-200">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black flex items-center gap-3">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">📊</span>
              Uptime History <span className="text-gray-500 text-sm font-bold ml-2">Last 60 Days</span>
            </h3>
            <div className="text-emerald-400 font-black text-sm tracking-widest">{avgAvailability}% AVAILABLE</div>
          </div>
          <div className="flex gap-[4px] h-10 items-end">
             {/* Fill with history or empty blocks if history is less than 60 days */}
             {Array.from({ length: 60 }).map((_, i) => {
               const historyIndex = i - (60 - (data?.history?.length || 0));
               const log = historyIndex >= 0 ? data?.history?.[historyIndex] : null;
               
               let bgColor = "bg-white/5";
               let statusText = "No data recorded";

               if (log) {
                 const percentage = Number(log.uptime_percentage);
                 if (percentage >= 99.9) {
                   bgColor = "bg-emerald-500/40";
                   statusText = `All systems healthy (${log.check_date})`;
                 } else if (percentage >= 95) {
                   bgColor = "bg-amber-500/40";
                   statusText = `Partial issues detected: ${percentage}% uptime (${log.check_date})`;
                 } else {
                   bgColor = "bg-red-500/40";
                   statusText = `Major outage: ${percentage}% uptime (${log.check_date})`;
                 }
               }

               return (
                 <div 
                   key={i} 
                   className={`flex-1 rounded-[2px] h-full transition-all duration-500 hover:scale-y-125 hover:brightness-125 ${bgColor}`}
                   title={statusText}
                 />
               );
             })}
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
            <span>60 Days Ago</span>
            <span>Today</span>
          </div>
        </div>


        {/* Note */}
        <p className="text-center text-gray-500 text-sm italic animate-fade-up">
          Status data is automatically updated every 5 seconds via the core system path.
        </p>

        {/* Back Button */}
        <div className="mt-16 justify-center flex animate-fade-up">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <Link
              href="/"
              className="relative px-10 py-5 bg-[#0a0a0f] border border-white/10 text-white font-black rounded-full transition-all flex items-center gap-4 hover:border-white/20"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              BACK TO HEADQUARTERS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'from-indigo-500/20 border-indigo-500/30 text-indigo-400',
    emerald: 'from-emerald-500/20 border-emerald-500/30 text-emerald-400',
    purple: 'from-purple-500/20 border-purple-500/30 text-purple-400',
    amber: 'from-amber-500/20 border-amber-500/30 text-amber-400'
  };

  return (
    <div className={`glass-card p-8 rounded-[2.5rem] bg-gradient-to-br ${colors[color].split(' ')[0]} to-transparent border ${colors[color].split(' ')[1]} transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-6">
        <div className={`p-3 rounded-2xl bg-white/10 ${colors[color].split(' ')[2]} backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.05)]`}>
          {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
      </div>
      <div className="text-3xl font-black mb-1">{value}</div>
      <div className="text-gray-500 text-xs font-bold">{sub}</div>
    </div>
  );
}

