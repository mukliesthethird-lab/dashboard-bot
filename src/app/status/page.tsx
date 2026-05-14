"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Shard { id: number; status: string; latency: string; servers: number; users: number; }
interface UptimeHistory { check_date: string; uptime_percentage: number; incident_count: number; }
interface StatusData {
  status: string; version: string; uptime: string; latency: string;
  shards: Shard[]; clusters: number; memoryUsage: string; lastUpdate: string;
  totalServers?: number; totalUsers?: number; history?: UptimeHistory[];
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
      } catch (err) { console.error(err); }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const avgAvailability = data?.history && data.history.length > 0
    ? (data.history.reduce((acc, curr) => acc + Number(curr.uptime_percentage), 0) / data.history.length).toFixed(2)
    : "100.00";

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-8">
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="px-2.5 py-1 rounded-md bg-[var(--success-muted)] text-[var(--success)] text-[10px] font-semibold uppercase tracking-wider">
              Live System Metrics
            </div>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            System <span className="gradient-text">Status</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-sm max-w-lg">
            Real-time monitoring of Don Pollo's infrastructure. Updated every 5 seconds.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 animate-fade-up animate-delay-100">
          <StatCard label="Latency" value={data?.latency || "0ms"} sub="Gateway ping" icon="⚡" />
          <StatCard label="Uptime" value={data?.uptime || "0d 0h"} sub="Since deployment" icon="🕐" />
          <StatCard label="Servers" value={data?.totalServers?.toLocaleString() || "0"} sub="All shards" icon="🖥️" />
          <StatCard label="Memory" value={data?.memoryUsage.split(' / ')[0] || "0MB"} sub="Resource usage" icon="💾" />
        </div>

        {/* Uptime History */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 mb-6 animate-fade-up animate-delay-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              📊 Uptime History <span className="text-[var(--text-tertiary)] text-xs font-normal ml-1">Last 60 Days</span>
            </h3>
            <div className="text-[var(--success)] text-xs font-semibold">{avgAvailability}% Available</div>
          </div>
          <div className="flex gap-[3px] h-8 items-end">
            {Array.from({ length: 60 }).map((_, i) => {
              const historyIndex = i - (60 - (data?.history?.length || 0));
              const log = historyIndex >= 0 ? data?.history?.[historyIndex] : null;
              let bgColor = "bg-white/5";
              let statusText = "No data recorded";
              if (log) {
                const percentage = Number(log.uptime_percentage);
                if (percentage >= 99.9) { bgColor = "bg-[var(--success)]/50"; statusText = `Healthy (${log.check_date})`; }
                else if (percentage >= 95) { bgColor = "bg-[var(--warning)]/50"; statusText = `Partial: ${percentage}% (${log.check_date})`; }
                else { bgColor = "bg-[var(--error)]/50"; statusText = `Outage: ${percentage}% (${log.check_date})`; }
              }
              return (
                <div key={i} className={`flex-1 rounded-sm h-full transition-all hover:brightness-125 ${bgColor}`} title={statusText} />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-[var(--text-tertiary)] font-medium">
            <span>60 Days Ago</span>
            <span>Today</span>
          </div>
        </div>

        <p className="text-center text-[var(--text-tertiary)] text-xs mb-8">
          Status data is automatically updated every 5 seconds.
        </p>

        {/* Back Button */}
        <div className="flex justify-center animate-fade-up">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--border-hover)] font-medium text-sm rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: string }) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--border-hover)] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-base">{icon}</div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</span>
      </div>
      <div className="text-xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-[var(--text-tertiary)] text-xs">{sub}</div>
    </div>
  );
}
