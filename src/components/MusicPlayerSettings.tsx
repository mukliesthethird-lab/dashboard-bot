"use client";

import { useState } from "react";
import Toast from "./Toast";

interface Props {
  guildId: string;
}

export default function MusicPlayerSettings({ guildId }: Props) {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(80);

  const [settings, setSettings] = useState({
      djRole: "DJ",
      restrictToVoice: true,
      announceSongs: false,
      defaultVolume: 100,
  });

  const handleSave = () => {
    setToast({ message: "Music settings saved!", type: "success" });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-up">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Web Player Panel (Left) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Now Playing UI */}
            <div className="relative overflow-hidden rounded-[2rem] glass p-8 border border-white/10 flex-1">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-800/10 z-0"></div>
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/30 rounded-full blur-[100px] z-0"></div>
                
                <div className="relative z-10 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-widest border border-white/10 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            Live Server Web Player
                        </div>
                        <div className="text-gray-400 text-sm font-medium">Channel: General Voice</div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center md:items-end gap-8 flex-1">
                        <img 
                            src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=300&h=300"
                            alt="Album Art"
                            className="w-48 h-48 md:w-56 md:h-56 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-cover border border-white/10"
                        />
                        <div className="flex-1 w-full text-center md:text-left">
                            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">Midnight City (Remix)</h2>
                            <p className="text-lg text-indigo-300 font-medium mb-6">M83</p>
                            
                            {/* Progress Bar */}
                            <div className="space-y-2 mb-6">
                                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                                    <div className="h-full bg-white w-[45%] rounded-full relative">
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow"></div>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs font-medium text-gray-400 font-mono">
                                    <span>2:14</span>
                                    <span>4:01</span>
                                </div>
                            </div>
                            
                            {/* Controls */}
                            <div className="flex items-center justify-center md:justify-start gap-6">
                                <button className="text-gray-400 hover:text-white transition"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M13 5l-8 5 8 5V5z"/></svg></button>
                                <button 
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className="w-16 h-16 bg-white hover:scale-105 transition-transform rounded-full flex items-center justify-center text-indigo-900 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                                >
                                    {isPlaying ? (
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                                    ) : (
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/></svg>
                                    )}
                                </button>
                                <button className="text-gray-400 hover:text-white transition"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M7 5l8 5-8 5V5z"/></svg></button>
                                
                                <div className="ml-auto hidden md:flex items-center gap-3 w-32">
                                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd"/></svg>
                                    <input type="range" className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Queue Component */}
            <div className="glass-card rounded-[2rem] p-6 border border-white/10">
                 <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-indigo-400">📋</span> Up Next
                </h3>
                <div className="space-y-2">
                    {[
                        { title: 'Starboy', artist: 'The Weeknd', duration: '3:50', req: 'User123' },
                        { title: 'Levitating', artist: 'Dua Lipa', duration: '3:23', req: 'MusicLover' },
                        { title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:22', req: 'Banteng' },
                    ].map((s,i) => (
                        <div key={i} className="flex grid-cols-12 items-center p-3 bg-[#0a0a0f] border border-white/5 rounded-xl hover:bg-white/5 transition">
                            <div className="text-gray-500 font-bold w-8 text-center">{i+1}</div>
                            <div className="flex-1 min-w-0 px-2">
                                <div className="text-white font-bold truncate text-sm">{s.title}</div>
                                <div className="text-gray-400 text-xs">{s.artist}</div>
                            </div>
                            <div className="hidden md:block w-32 text-xs text-gray-500">Req by {s.req}</div>
                            <div className="text-gray-400 font-mono text-xs w-12 text-right">{s.duration}</div>
                            <button className="ml-4 text-gray-500 hover:text-red-400 transition p-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                    ))}
                </div>
            </div>

        </div>

        {/* Global Settings (Right) */}
        <div className="lg:col-span-4 space-y-6">
            <div className="glass-card rounded-[2rem] p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">Player Config</h3>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">DJ Role</label>
                        <select className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 font-medium">
                            <option>@DJ</option>
                            <option>@Admin</option>
                            <option>@Everyone</option>
                        </select>
                    </div>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-[#0a0a0f] border border-white/5 cursor-pointer hover:border-white/10 transition">
                        <div>
                            <div className="font-bold text-white text-sm">Restrict to Voice Channel</div>
                            <div className="text-xs text-gray-500">Users must be in same VC</div>
                        </div>
                        <input type="checkbox" className="custom-checkbox" checked={settings.restrictToVoice} onChange={(e) => setSettings({...settings, restrictToVoice: e.target.checked})} />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-[#0a0a0f] border border-white/5 cursor-pointer hover:border-white/10 transition">
                        <div>
                            <div className="font-bold text-white text-sm">Announce Songs</div>
                            <div className="text-xs text-gray-500">Send message when song starts</div>
                        </div>
                        <input type="checkbox" className="custom-checkbox" checked={settings.announceSongs} onChange={(e) => setSettings({...settings, announceSongs: e.target.checked})} />
                    </label>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-gray-400">Default Volume</label>
                            <span className="text-white font-mono bg-white/10 px-2 py-0.5 rounded text-xs">{settings.defaultVolume}%</span>
                        </div>
                        <input type="range" className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" value={settings.defaultVolume} onChange={(e) => setSettings({...settings, defaultVolume: Number(e.target.value)})} />
                    </div>
                </div>

                <button onClick={handleSave} className="w-full mt-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    Save Config
                </button>
            </div>
        </div>

      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
