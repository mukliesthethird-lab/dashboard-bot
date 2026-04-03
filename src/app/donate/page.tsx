"use client";

import { DONORS, Donor } from "@/lib/data";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function DonatePage() {
   const pathname = usePathname();
   const [donors, setDonors] = useState<Donor[]>([]);
   const [currentGoal, setCurrentGoal] = useState(0);
   const [isLoading, setIsLoading] = useState(true);
   const targetGoal = 1000000; // Mock Target: Rp 1.000.000
   const progressPercent = Math.min((currentGoal / targetGoal) * 100, 100);

   useEffect(() => {
      const fetchDonors = async () => {
         try {
            const res = await fetch('/api/donors');
            const data = await res.json();
            if (data.donors) {
               // Format date dari database
               const formattedDonors = data.donors.map((d: any) => ({
                  ...d,
                  amount: `Rp ${Number(d.amount).toLocaleString('id-ID')}`,
                  date: new Date(d.date).toISOString().split('T')[0]
               }));
               setDonors(formattedDonors);
            }
            if (data.currentGoal) setCurrentGoal(data.currentGoal);
         } catch (err) {
            console.error("Failed to fetch donors:", err);
         } finally {
            setIsLoading(false);
         }
      };

      fetchDonors();
   }, []);

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

         <div className="relative z-10 max-w-6xl mx-auto">
            {/* 🏆 Hero Section */}
            <div className="text-center mb-24 animate-fade-up">
               <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md text-amber-400 text-xs font-black uppercase tracking-[0.3em] mb-10 group cursor-default">
                  <span className="animate-pulse">✨</span>
                  <span className="opacity-80 group-hover:opacity-100 transition-opacity">Patrons of Excellence</span>
                  <span className="animate-pulse">✨</span>
               </div>

               <h1 className="text-7xl md:text-9xl font-black mb-8 tracking-tighter leading-[0.8] text-white">
                  CELESTIAL <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-500 to-orange-600 drop-shadow-[0_10px_30px_rgba(245,158,11,0.2)]">HALL OF FAME</span>
               </h1>

               <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed mb-12 opacity-80">
                  Didedikasikan untuk para pahlawan di balik layar yang mendukung infrastruktur Don Pollo tetap kokoh dan terus berekspansi.
               </p>

               {/* 📊 Monthly Goal Tracker */}
               <div className="max-w-md mx-auto p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-xl relative group">
                  <div className="flex justify-between items-end mb-4">
                     <div className="text-left">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Monthly Infrastructure Goal</p>
                        {isLoading ? (
                           <div className="h-8 w-32 bg-white/5 animate-pulse rounded-lg" />
                        ) : (
                           <p className="text-2xl font-black text-white">
                              Rp {currentGoal.toLocaleString('id-ID')} <span className="text-gray-500 text-sm font-bold">/ Rp 1M</span>
                           </p>
                        )}
                     </div>
                     <div className="text-right">
                        <p className="text-3xl font-black text-amber-500">{progressPercent.toFixed(0)}%</p>
                     </div>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                     <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercent}%` }}
                     />
                  </div>
                  <p className="text-[10px] text-gray-600 font-bold text-center italic">Server costs, API keys, and coffee for the dev.</p>
               </div>
            </div>

            {/* 💸 Refined High-Impact CTA Section */}
            <div className="mb-32 flex justify-center animate-fade-up animate-delay-100">
               <div className="max-w-5xl w-full p-16 rounded-[3.5rem] bg-white/[0.02] backdrop-blur-3xl border border-white/5 relative overflow-hidden group transition-all duration-500 hover:border-amber-500/30 hover:bg-white/[0.04]">
                  {/* Subtle Ambient Glow on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-transparent to-orange-500/0 group-hover:from-amber-500/[0.03] group-hover:to-orange-500/[0.03] transition-all duration-700" />

                  <div className="relative z-10 text-center">
                     <h2 className="text-5xl md:text-6xl font-black mb-8 tracking-tighter leading-tight text-white">
                        Become Part of <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">The Legacy.</span>
                     </h2>
                     <p className="text-gray-400 font-medium text-lg mb-12 leading-relaxed max-w-2xl mx-auto opacity-80 group-hover:opacity-100 transition-opacity">
                        Setiap dukungan Anda sangat berarti untuk menjadi bahan bakar saya dalam mengembangkan Don Pollo.
                     </p>

                     <a
                        href="https://saweria.co/croudly"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/btn relative inline-flex items-center gap-4 px-12 py-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xl rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(245,158,11,0.3)] shadow-lg active:scale-95"
                     >
                        <span className="flex items-center gap-3">
                           <span className="text-2xl">☕</span> Support via Saweria
                        </span>
                     </a>
                  </div>
               </div>
            </div>

            {/* 🏆 Hall of Fame List */}
            <div className="space-y-16 animate-fade-up animate-delay-300">
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                     <h2 className="text-5xl font-black tracking-tighter mb-2">SUPPORTERS</h2>
                     <p className="text-amber-500 font-bold uppercase tracking-[0.2em] text-xs">The Heroes of Don Pollo</p>
                  </div>
                  <div className="flex gap-4">
                     {['All', 'Gold', 'Silver', 'Bronze'].map(f => (
                        <button key={f} className={`px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-black hover:bg-white/10 transition-all`}>
                           {f}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {isLoading ? (
                     Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-64 rounded-[3rem] bg-white/[0.02] border-2 border-white/5 animate-pulse" />
                     ))
                  ) : donors.length > 0 ? (
                     donors.map((donor, idx) => (
                        <CelestialDonorCard key={idx} donor={donor} index={idx} />
                     ))
                  ) : (
                     <div className="col-span-full py-20 text-center glass-card rounded-[3rem] border-white/5 bg-white/[0.02]">
                        <p className="text-gray-500 font-bold italic">Belum ada donatur bulan ini. Jadilah yang pertama!</p>
                     </div>
                  )}
               </div>
            </div>

            {/* 🔙 Back Home */}
            <div className="mt-32 text-center animate-fade-up animate-delay-[400ms]">
               <Link
                  href="/"
                  className="group inline-flex items-center gap-4 px-10 py-5 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-xl text-white font-black rounded-full transition-all border border-white/10 hover:scale-105 active:scale-95"
               >
                  <svg className="w-5 h-5 transition-transform group-hover:-translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  BACK TO HEADQUARTERS
               </Link>
            </div>
         </div>
      </div>
   );
}

function CelestialDonorCard({ donor, index }: { donor: Donor; index: number }) {
   const styles = {
      Gold: {
         borderColor: "border-amber-500/30",
         glowColor: "shadow-[0_0_40px_rgba(245,158,11,0.1)]",
         gradient: "from-amber-500/10 to-transparent",
         badge: "bg-amber-500 text-white shadow-[0_5px_15px_rgba(245,158,11,0.4)]",
         icon: "👑"
      },
      Silver: {
         borderColor: "border-indigo-400/30",
         glowColor: "shadow-[0_0_40px_rgba(129,140,248,0.1)]",
         gradient: "from-indigo-500/10 to-transparent",
         badge: "bg-indigo-400 text-white shadow-[0_5px_15px_rgba(129,140,248,0.4)]",
         icon: "🥈"
      },
      Bronze: {
         borderColor: "border-orange-800/30",
         glowColor: "shadow-[0_0_40px_rgba(154,52,18,0.05)]",
         gradient: "from-orange-800/10 to-transparent",
         badge: "bg-orange-800 text-white shadow-[0_5px_15px_rgba(154,52,18,0.4)]",
         icon: "🥉"
      }
   };

   const config = styles[donor.tier];

   return (
      <div
         className={`group p-10 rounded-[3rem] border-2 glass-card relative overflow-hidden transition-all duration-700 hover:-translate-y-2 ${config.borderColor} ${config.glowColor}`}
         style={{ animationDelay: `${index * 150}ms` }}
      >
         {/* Background Sheen */}
         <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-40 group-hover:opacity-100 transition-opacity duration-700`} />
         <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-[0.02] group-hover:opacity-[0.05] blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-all duration-700" />

         <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
               <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110 duration-500 bg-white/5 backdrop-blur-md border border-white/10`}>
                     {config.icon}
                  </div>
                  <div>
                     <div className={`inline-flex items-center px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 ${config.badge}`}>
                        {donor.tier} Patron
                     </div>
                     <h3 className="text-3xl font-black text-white tracking-tighter leading-none">{donor.name}</h3>
                  </div>
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Grant Amount</span>
                  <span className="text-2xl font-black text-white">{donor.amount}</span>
               </div>
            </div>

            <div className="bg-black/20 backdrop-blur-sm p-6 rounded-2xl border border-white/5 relative group/msg">
               <p className="text-gray-400 font-medium italic text-lg leading-relaxed quotes">
                  {donor.message}
               </p>
               <div className="mt-4 flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">{donor.date}</span>
                  <div className="flex -space-x-2">
                     {[1, 2, 3].map(i => (
                        <div key={i} className="w-5 h-5 rounded-full border-2 border-slate-900 bg-gray-800" />
                     ))}
                     <div className="w-5 h-5 rounded-full border-2 border-slate-900 bg-amber-500 flex items-center justify-center text-[8px] font-bold text-black">+</div>
                  </div>
               </div>
            </div>
         </div>

         {/* Watermark */}
         <div className="absolute -bottom-8 -right-8 text-[120px] font-black text-white/[0.02] rotate-12 select-none group-hover:text-white/[0.05] transition-colors group-hover:scale-110 duration-700">
            #{index + 1}
         </div>
      </div>
   );
}

