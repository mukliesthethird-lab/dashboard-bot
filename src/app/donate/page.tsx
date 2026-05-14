"use client";

import Link from "next/link";

export default function DonatePage() {
   return (
      <div className="min-h-screen pt-24 pb-16 px-6">
         <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
            {/* Hero */}
            <div className="text-center mb-10 animate-fade-up">
               <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-amber-400 text-xs font-semibold uppercase tracking-wider mb-8">
                  <span>✨</span>
                  <span>Support the project</span>
                  <span>✨</span>
               </div>

               <h1 className="text-4xl md:text-5xl font-bold mb-5 tracking-tight text-white leading-tight">
                  Fuel the <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">Legacy</span>
               </h1>

               <p className="text-[var(--text-secondary)] max-w-md mx-auto text-sm leading-relaxed">
                  Dukungan Anda membantu saya tetap berinovasi dan menjaga infrastruktur Don Pollo tetap berjalan optimal.
               </p>
            </div>

            {/* CTA */}
            <div className="animate-fade-up animate-delay-100">
               <a
                  href="https://saweria.co/croudly"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-xl transition-all hover:brightness-110 hover:shadow-lg hover:shadow-amber-500/25 active:scale-95"
               >
                  <span className="text-2xl">☕</span>
                  Support via Saweria
               </a>
            </div>

            {/* Back */}
            <div className="mt-16 animate-fade-up animate-delay-300">
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
