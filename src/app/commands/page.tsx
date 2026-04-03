"use client";

import { useState } from "react";
import { COMMANDS, Command } from "@/lib/data";
import Link from "next/link";

const CATEGORIES = ["All", "Economy", "Fishing", "Music", "Moderation", "Fun/Games", "General"];

export default function CommandsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredCommands = COMMANDS.filter((cmd) => {
    const matchesSearch = cmd.name.toLowerCase().includes(search.toLowerCase()) || 
                          cmd.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || cmd.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="relative min-h-screen bg-[#030305] text-white pt-32 pb-24 px-6 overflow-x-hidden">
      {/* Background System */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#4338ca15,transparent_50%),radial-gradient(circle_at_80%_80%,#a21caf10,transparent_50%)]" />
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-indigo-600/20 blur-[140px] rounded-full animate-aurora" />
        <div className="absolute bottom-0 right-[-10%] w-[60vw] h-[60vh] bg-fuchsia-600/15 blur-[140px] rounded-full animate-aurora" style={{ animationDelay: '5s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-up">
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
            COMMANDS <span className="text-gradient">WIKI</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-medium">
            Discover all available commands to make your server more vibrant and interactive.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="glass-card bg-[#0a0a0f]/60 p-4 md:p-6 mb-12 flex flex-col md:flex-row gap-6 items-center justify-between animate-fade-up animate-delay-100">
          <div className="relative w-full md:w-96 group">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium"
            />
          </div>

          <div className="flex-1 w-full min-w-0 overflow-hidden">
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 py-2.5 rounded-full font-bold transition-all whitespace-nowrap ${
                    activeCategory === cat 
                      ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Commands List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up animate-delay-200">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => (
              <div 
                key={cmd.name} 
                className="group p-8 rounded-[2.5rem] bg-[#111214]/50 border border-white/5 hover:border-indigo-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full">
                    {cmd.category}
                  </span>
                  {cmd.permissions && (
                    <span className="text-[10px] font-bold uppercase text-red-400 bg-red-400/10 px-3 py-1 rounded-full">
                      {cmd.permissions}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-white mb-3 group-hover:text-indigo-400 transition-colors">
                  /{cmd.name}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  {cmd.description}
                </p>
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                  <span className="block text-[10px] uppercase font-black tracking-widest text-gray-500 mb-2">Usage</span>
                  <code className="text-emerald-400 font-mono text-sm break-all">{cmd.usage}</code>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <span className="text-6xl mb-6 block">🔍</span>
              <h3 className="text-2xl font-bold text-gray-400">No commands found matching "{search}"</h3>
              <p className="text-gray-500 mt-2">Try another keyword or choose a different category.</p>
            </div>
          )}
        </div>
        {/* Back Button */}
        <div className="mt-16 justify-center flex animate-fade-up animate-delay-300">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 px-8 py-4 glass-card hover:bg-white/10 text-white font-bold rounded-full transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/10"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Headquarters
          </Link>
        </div>
      </div>
    </div>
  );
}
