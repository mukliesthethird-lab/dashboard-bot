import { Metadata } from "next";

export const metadata: Metadata = {
   title: "Donate",
   description: "Support the independent development and infrastructure of Don Pollo—the premium Discord bot without a paywall."
};

export default function DonatePage() {
   return (
      <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pt-16 pb-16 px-6 md:px-12 relative overflow-x-hidden font-sans selection:bg-amber-500/30">
         {/* Dynamic Background Elements */}
         <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-orange-600/10 rounded-full blur-[100px]" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03]" />
         </div>

         <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center justify-center min-h-[85vh]">
            {/* Header */}
            <div className="text-center mb-10 animate-fade-up">
               <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[1] tracking-tighter">
                  Fuel the <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500/40">
                     Legacy.
                  </span>
               </h1>

               <p className="text-lg md:text-xl text-[var(--text-secondary)] font-medium max-w-xl mx-auto leading-relaxed">
                  Don Pollo is a premium service provided <span className="text-white">completely free from paywalls. </span>
                  Your contributions directly fund our global infrastructure and continuous innovation.
               </p>
            </div>

            {/* Donation Card */}
            <div className="w-full max-w-lg animate-fade-up animate-delay-100">
               <div className="group relative p-1 rounded-[40px] bg-gradient-to-br from-amber-500/20 to-transparent border border-amber-500/10 hover:border-amber-500/30 transition-all duration-500 shadow-2xl">
                  <div className="bg-[var(--bg-secondary)] rounded-[36px] p-10 md:p-14 text-center overflow-hidden relative">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-amber-500/10 transition-all" />

                     <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500 mx-auto mb-8 group-hover:scale-110 transition-all duration-500 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>

                     <h3 className="text-2xl font-black text-white mb-4 tracking-tight">Support via Saweria</h3>
                     <p className="text-[var(--text-tertiary)] text-sm font-medium leading-relaxed mb-10">
                        The most direct way to support our independent development and maintain server stability.
                     </p>

                     <a
                        href="https://saweria.co/croudly"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-4 px-10 py-5 bg-amber-500 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_40px_rgba(245,158,11,0.2)]"
                     >
                        <span>Donate Now</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                     </a>
                  </div>
               </div>
            </div>
         </div>

         {/* Premium Manual Supporters Ticker */}
         <div className="fixed bottom-0 left-0 w-full animate-fade-in z-50">
            <div className="bg-white/[0.02] border-t border-[var(--border)] backdrop-blur-md overflow-hidden h-12 flex items-center">
               <div className="flex whitespace-nowrap animate-marquee items-center gap-12">
                  {[
                     "PREMIUM SUPPORT",
                     "THANKS TO ALL SUPPORTERS",
                     "DON POLLO LEGACY",
                     "COMMUNITY DRIVEN",
                     "ZERO PAYWALL PROJECT",
                     "PREMIUM SUPPORT",
                     "THANKS TO ALL SUPPORTERS",
                     "DON POLLO LEGACY",
                     "COMMUNITY DRIVEN",
                     "ZERO PAYWALL PROJECT"
                  ].map((text, i) => (
                     <div key={i} className="flex items-center gap-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-amber-400 transition-colors cursor-default">
                           {text}
                        </span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </main>
   );
}
