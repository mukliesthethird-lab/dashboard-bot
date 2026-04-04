"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DonatePage() {
   const pathname = usePathname();

   return (
      <div className="relative min-h-screen bg-[#030305] text-white pt-32 pb-40 px-6 overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200">
         {/* 🌌 High-End Celestial Background System */}
         <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            {/* Layer 1: Base Mesh */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#4338ca20,transparent_70%),radial-gradient(circle_at_80%_80%,#f59e0b10,transparent_50%)]" />

            {/* Layer 2: Moving Orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[100vw] h-[70vh] bg-indigo-500/10 blur-[160px] rounded-full animate-aurora opacity-70" style={{ animationDuration: '20s' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vh] bg-amber-500/10 blur-[150px] rounded-full animate-aurora opacity-50" style={{ animationDelay: '3s', animationDuration: '25s' }} />
            <div className="absolute top-[30%] left-[20%] w-[40vw] h-[40vh] bg-purple-600/5 blur-[120px] rounded-full animate-aurora opacity-30" style={{ animationDelay: '7s', animationDuration: '30s' }} />

            {/* Layer 3: Grid Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
         </div>

         <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
            {/* 🏆 Hero Section */}
            <div className="text-center mb-16 animate-fade-up">
               <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md text-amber-400 text-xs font-black uppercase tracking-[0.3em] mb-10 group cursor-default">
                  <span className="animate-pulse">✨</span>
                  <span className="opacity-80 group-hover:opacity-100 transition-opacity">Support the project</span>
                  <span className="animate-pulse">✨</span>
               </div>

               <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.8] text-white">
                  FUEL THE <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-500 to-orange-600 drop-shadow-[0_10px_30px_rgba(245,158,11,0.2)]">LEGACY</span>
               </h1>

               <p className="text-lg text-gray-400 max-w-xl mx-auto font-medium leading-relaxed opacity-80">
                  Dukungan Anda membantu saya tetap berinovasi dan menjaga infrastruktur Don Pollo tetap berjalan optimal.
               </p>
            </div>

            {/* 💸 Minimal CTA Section */}
            <div className="animate-fade-up animate-delay-100">
               <a
                  href="https://saweria.co/croudly"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/btn relative inline-flex items-center gap-4 px-12 py-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-2xl rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_20px_40px_rgba(245,158,11,0.4)] shadow-lg active:scale-95 border border-white/10"
               >
                  <span className="flex items-center gap-3">
                     <span className="text-3xl">☕</span> Support via Saweria
                  </span>
               </a>
            </div>

            {/* 🔙 Back Home */}
            <div className="mt-24 text-center animate-fade-up animate-delay-[400ms]">
               <Link
                  href="/"
                  className="group inline-flex items-center gap-4 px-8 py-4 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-xl text-white/50 hover:text-white font-bold rounded-full transition-all border border-white/5 hover:border-white/10"
               >
                  <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  BACK HOME
               </Link>
            </div>
         </div>
      </div>
   );
}


