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
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-8">
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">
            Commands <span className="gradient-text">Wiki</span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-lg mx-auto text-sm">
            Discover all available commands to make your server more vibrant and interactive.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 mb-8 flex flex-col md:flex-row gap-4 items-center animate-fade-up animate-delay-100">
          <div className="relative w-full md:w-80">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <div className="flex-1 w-full min-w-0 overflow-hidden">
            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Commands Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-up animate-delay-200">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd) => (
              <div
                key={cmd.name}
                className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)] transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-md">
                    {cmd.category}
                  </span>
                  {cmd.permissions && (
                    <span className="text-[10px] font-semibold uppercase text-[var(--error)] bg-[var(--error-muted)] px-2 py-0.5 rounded-md">
                      {cmd.permissions}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">/{cmd.name}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-3">{cmd.description}</p>
                <div className="bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--border)]">
                  <span className="block text-[10px] uppercase font-semibold tracking-wider text-[var(--text-tertiary)] mb-1">Usage</span>
                  <code className="text-emerald-400 font-mono text-xs break-all">{cmd.usage}</code>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center">
              <span className="text-4xl mb-4 block">🔍</span>
              <h3 className="text-lg font-semibold text-[var(--text-secondary)]">No commands found matching "{search}"</h3>
              <p className="text-[var(--text-tertiary)] text-sm mt-1">Try another keyword or choose a different category.</p>
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-10 flex justify-center animate-fade-up animate-delay-300">
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
