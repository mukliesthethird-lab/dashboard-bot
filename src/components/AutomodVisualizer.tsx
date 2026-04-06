"use client";

import { useState, useMemo, useEffect } from "react";
import Toast from "./Toast";
import CatLoader from "./CatLoader";

interface Props {
  guildId: string;
}

interface Channel {
    id: string;
    name: string;
}

export default function AutomodVisualizer({ guildId }: Props) {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);

  // Core Shield State
  const [antiLinks, setAntiLinks] = useState(false);
  const [antiInvites, setAntiInvites] = useState(false);
  const [antiSpam, setAntiSpam] = useState(false);
  const [antiCaps, setAntiCaps] = useState(false);
  const [antiMentions, setAntiMentions] = useState(false);
  const [antiZalgo, setAntiZalgo] = useState(false);
  const [antiEmoji, setAntiEmoji] = useState(false);

  // Settings
  const [spamThreshold, setSpamThreshold] = useState(70);
  const [capsThreshold, setCapsThreshold] = useState(70);
  const [mentionsThreshold, setMentionsThreshold] = useState(5);
  const [emojiThreshold, setEmojiThreshold] = useState(10);
  const [penaltyAction, setPenaltyAction] = useState("warn");
  const [logChannelId, setLogChannelId] = useState("");

  // Regex Engine State
  const [blacklistedWords, setBlacklistedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
      const fetchData = async () => {
          try {
              const res = await fetch(`/api/automod?guild_id=${guildId}`);
              const data = await res.json();
              if (data && !data.error) {
                  setAntiLinks(!!data.anti_links);
                  setAntiInvites(!!data.anti_invites);
                  setAntiSpam(!!data.anti_spam);
                  setAntiCaps(!!data.anti_caps);
                  setAntiMentions(!!data.anti_mentions);
                  setAntiZalgo(!!data.anti_zalgo);
                  setAntiEmoji(!!data.anti_emoji);
                  setSpamThreshold(data.spam_threshold || 70);
                  setCapsThreshold(data.caps_threshold || 70);
                  setMentionsThreshold(data.mentions_threshold || 5);
                  setEmojiThreshold(data.emoji_threshold || 10);
                  setPenaltyAction(data.penalty_action || "warn");
                  setLogChannelId(data.log_channel_id || "");
                  try {
                      setBlacklistedWords(typeof data.blacklisted_words === 'string' ? JSON.parse(data.blacklisted_words) : (data.blacklisted_words || []));
                  } catch (e) {
                      setBlacklistedWords([]);
                  }
              }
              
              // Fetch channels for logging
              const chanRes = await fetch(`/api/welcome?action=channels&guild_id=${guildId}`);
              const chanData = await chanRes.json();
              if (Array.isArray(chanData)) setChannels(chanData);

          } catch (error) {
              console.error("Failed to fetch automod settings", error);
          } finally {
              setLoading(false);
          }
      };
      fetchData();
  }, [guildId]);

  const handleAddWord = (e: React.FormEvent) => {
      e.preventDefault();
      if (newWord.trim() && !blacklistedWords.includes(newWord.trim())) {
          setBlacklistedWords([...blacklistedWords, newWord.trim()]);
          setNewWord("");
      }
  };

  const removeWord = (word: string) => {
      setBlacklistedWords(blacklistedWords.filter(w => w !== word));
  };

  // The Live Engine Checker (Simulator)
  const matchedRule = useMemo(() => {
      if (!testMessage.trim()) return null;
      
      const msg = testMessage.toLowerCase();
      
      // Auto blocked patterns
      if (antiLinks && /https?:\/\/[^\s]+/.test(msg)) return "URL Detection (Anti-Links)";
      if (antiInvites && /(discord\.gg|discordapp\.com\/invite)\/[^\s]+/.test(msg)) return "Discord Invite Detection";
      
      // Zalgo Detection
      if (antiZalgo && /[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/.test(testMessage)) return "Zalgo/Glitch Text";

      // Caps Detection
      if (antiCaps && testMessage.length > 10) {
          const caps = testMessage.replace(/[^A-Z]/g, "").length;
          const ratio = (caps / testMessage.length) * 100;
          if (ratio > capsThreshold) return `Excessive Caps (${Math.round(ratio)}%)`;
      }

      // Mention Detection
      if (antiMentions) {
          const mentions = (testMessage.match(/<@!?\d+>|<@&\d+>/g) || []).length;
          if (mentions > mentionsThreshold) return `Mass Mention (${mentions} mentions)`;
      }

      // Emoji Detection
      if (antiEmoji) {
        const emojis = (testMessage.match(/<a?:\w+:\d+>|[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu) || []).length;
        if (emojis > emojiThreshold) return `Emoji Spam (${emojis} emojis)`;
      }

      for (let word of blacklistedWords) {
          try {
              const regex = new RegExp(`\\b${word}\\b`, 'i');
              if (regex.test(msg)) return word;
              const rawRegex = new RegExp(word, 'i');
              if (rawRegex.test(msg)) return word;
          } catch (e) {
              if (msg.includes(word.toLowerCase())) return word;
          }
      }
      return null;
  }, [testMessage, blacklistedWords, antiLinks, antiInvites, antiZalgo, antiCaps, capsThreshold, antiMentions, mentionsThreshold, antiEmoji, emojiThreshold]);

  const handleReset = () => {
      setAntiLinks(false);
      setAntiInvites(false);
      setAntiSpam(false);
      setAntiCaps(false);
      setAntiMentions(false);
      setAntiZalgo(false);
      setAntiEmoji(false);
      setSpamThreshold(70);
      setCapsThreshold(70);
      setMentionsThreshold(5);
      setEmojiThreshold(10);
      setPenaltyAction("warn");
      setBlacklistedWords([]);
      setLogChannelId("");
      setToast({ message: "Settings reset (not saved until deployed).", type: "info" });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        const res = await fetch('/api/automod', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guild_id: guildId,
                anti_links: antiLinks,
                anti_invites: antiInvites,
                anti_spam: antiSpam,
                anti_caps: antiCaps,
                anti_mentions: antiMentions,
                anti_zalgo: antiZalgo,
                anti_emoji: antiEmoji,
                spam_threshold: spamThreshold,
                caps_threshold: capsThreshold,
                mentions_threshold: mentionsThreshold,
                emoji_threshold: emojiThreshold,
                penalty_action: penaltyAction,
                blacklisted_words: JSON.stringify(blacklistedWords),
                log_channel_id: logChannelId
            })
        });
        if (res.ok) {
            setToast({ message: "Security configurations deployed across the server!", type: "success" });
        } else {
            setToast({ message: "Failed to save settings.", type: "error" });
        }
    } catch (e) {
        setToast({ message: "Network error.", type: "error" });
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <CatLoader message="Loading Security Shields..." />;

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-black text-white tracking-tight">Security & AutoMod</h2>
           <p className="text-gray-400 mt-1">Configure intelligent defensive shields and regex-based word filters.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleReset}
            className="px-6 py-3 border border-white/10 hover:bg-white/5 text-gray-300 font-bold rounded-xl transition flex-1 md:flex-none"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition flex items-center justify-center min-w-[140px] shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50 flex-1 md:flex-none"
          >
            {saving ? (
               <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            ) : "Deploy Settings"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Security Toggles & Penalty */}
          <div className="space-y-6">
              <div className="glass-card bg-[#0a0a0f] rounded-2xl p-6 border border-white/5 space-y-4">
                 <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2">Core Shields</h3>
                 
                 {/* Anti Links */}
                 <div className="flex items-center justify-between p-4 bg-[#111214] border border-white/5 rounded-xl hover:border-white/10 transition">
                     <div>
                         <div className="font-bold text-white flex items-center gap-2">🔗 Anti-Links</div>
                         <div className="text-sm text-gray-500 mt-0.5">Deletes messages containing any 'http(s)://' URLs.</div>
                     </div>
                     <button onClick={() => setAntiLinks(!antiLinks)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${antiLinks ? 'bg-red-500' : 'bg-gray-700'}`}>
                         <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${antiLinks ? 'translate-x-5' : 'translate-x-0'}`} />
                     </button>
                 </div>

                 {/* Anti Invites */}
                 <div className="flex items-center justify-between p-4 bg-[#111214] border border-white/5 rounded-xl hover:border-white/10 transition">
                     <div>
                         <div className="font-bold text-white flex items-center gap-2">🎫 Anti-Discord Invites</div>
                         <div className="text-sm text-gray-500 mt-0.5">Deletes unauthorized discord.gg server invite codes.</div>
                     </div>
                     <button onClick={() => setAntiInvites(!antiInvites)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${antiInvites ? 'bg-red-500' : 'bg-gray-700'}`}>
                         <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${antiInvites ? 'translate-x-5' : 'translate-x-0'}`} />
                     </button>
                 </div>

                 {/* Anti Zalgo */}
                 <div className="flex items-center justify-between p-4 bg-[#111214] border border-white/5 rounded-xl hover:border-white/10 transition">
                     <div>
                         <div className="font-bold text-white flex items-center gap-2">🌀 Anti-Zalgo</div>
                         <div className="text-sm text-gray-500 mt-0.5">Deletes messages with glitchy/distorted characters.</div>
                     </div>
                     <button onClick={() => setAntiZalgo(!antiZalgo)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${antiZalgo ? 'bg-red-500' : 'bg-gray-700'}`}>
                         <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${antiZalgo ? 'translate-x-5' : 'translate-x-0'}`} />
                     </button>
                 </div>

                 {/* Anti Spam */}
                 <div className="p-4 bg-[#111214] border border-white/5 rounded-xl space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="font-bold text-white flex items-center gap-2">🔥 Anti-Spam</div>
                        <button onClick={() => setAntiSpam(!antiSpam)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${antiSpam ? 'bg-red-500' : 'bg-gray-700'}`}>
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${antiSpam ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                     </div>
                     <div className={`${!antiSpam && 'opacity-30 pointer-events-none'}`}>
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Aggressiveness</span>
                             <span className="text-white font-mono bg-white/10 px-2 py-0.5 rounded text-xs">{spamThreshold}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={spamThreshold} onChange={(e) => setSpamThreshold(Number(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-500" />
                     </div>
                 </div>

                  {/* Anti Caps */}
                  <div className="p-4 bg-[#111214] border border-white/5 rounded-xl space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="font-bold text-white flex items-center gap-2">🔠 Anti-Caps</div>
                        <button onClick={() => setAntiCaps(!antiCaps)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${antiCaps ? 'bg-red-500' : 'bg-gray-700'}`}>
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${antiCaps ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                     </div>
                     <div className={`${!antiCaps && 'opacity-30 pointer-events-none'}`}>
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Max Caps Percentage</span>
                             <span className="text-white font-mono bg-white/10 px-2 py-0.5 rounded text-xs">{capsThreshold}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={capsThreshold} onChange={(e) => setCapsThreshold(Number(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-500" />
                     </div>
                 </div>

                 {/* Anti Mentions */}
                 <div className="p-4 bg-[#111214] border border-white/5 rounded-xl space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="font-bold text-white flex items-center gap-2">📣 Anti-Mass Mention</div>
                        <button onClick={() => setAntiMentions(!antiMentions)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${antiMentions ? 'bg-red-500' : 'bg-gray-700'}`}>
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${antiMentions ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                     </div>
                     <div className={`${!antiMentions && 'opacity-30 pointer-events-none'}`}>
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Mention Limit</span>
                             <span className="text-white font-mono bg-white/10 px-2 py-0.5 rounded text-xs">{mentionsThreshold} Mentions</span>
                        </div>
                        <input type="range" min="1" max="50" value={mentionsThreshold} onChange={(e) => setMentionsThreshold(Number(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-500" />
                     </div>
                 </div>

                 {/* Anti Emoji */}
                 <div className="p-4 bg-[#111214] border border-white/5 rounded-xl space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="font-bold text-white flex items-center gap-2">😀 Anti-Emoji Spam</div>
                        <button onClick={() => setAntiEmoji(!antiEmoji)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${antiEmoji ? 'bg-red-500' : 'bg-gray-700'}`}>
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${antiEmoji ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                     </div>
                     <div className={`${!antiEmoji && 'opacity-30 pointer-events-none'}`}>
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Emoji Limit</span>
                             <span className="text-white font-mono bg-white/10 px-2 py-0.5 rounded text-xs">{emojiThreshold} Emojis</span>
                        </div>
                        <input type="range" min="1" max="50" value={emojiThreshold} onChange={(e) => setEmojiThreshold(Number(e.target.value))} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-500" />
                     </div>
                 </div>
              </div>

              {/* Penalty and Logs */}
              <div className="glass-card bg-[#0a0a0f] rounded-2xl p-6 border border-white/5 space-y-6">
                 <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2">Sanctions & Logs</h3>
                 
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Default Penalty Action</label>
                    <select value={penaltyAction} onChange={(e) => setPenaltyAction(e.target.value)} className="w-full bg-[#111214] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 font-bold transition-colors">
                        <option value="warn">Warn & Delete Message</option>
                        <option value="mute_5m">Mute for 5 Minutes</option>
                        <option value="mute_10m">Mute for 10 Minutes</option>
                        <option value="mute_1h">Mute for 1 Hour</option>
                        <option value="kick">Kick User</option>
                        <option value="ban">Permanently Ban</option>
                    </select>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Log Automod Actions To</label>
                    <select value={logChannelId} onChange={(e) => setLogChannelId(e.target.value)} className="w-full bg-[#111214] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 font-bold transition-colors">
                        <option value="">🚫 Disable Logging</option>
                        {channels.map(c => <option key={c.id} value={c.id}># {c.name}</option>)}
                    </select>
                 </div>
              </div>
          </div>

          {/* Right Column: Regex & Tester */}
          <div className="space-y-6">
              <div className="glass-card bg-[#0a0a0f] rounded-2xl p-6 border border-white/5 flex flex-col">
                 <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2">Regex Filter & Bad Words</h3>
                 <p className="text-sm text-gray-400 mb-6 flex-wrap">Any messages hitting these patterns will immediately trigger the shield rules.</p>

                 <form onSubmit={handleAddWord} className="flex gap-2 mb-6">
                     <input 
                         type="text" 
                         value={newWord} 
                         onChange={(e) => setNewWord(e.target.value)} 
                         placeholder="Enter word or raw regex..." 
                         className="flex-1 bg-[#111214] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 font-mono text-sm transition-colors"
                     />
                     <button type="submit" className="px-4 bg-[#111214] border border-white/10 hover:border-white/30 text-white font-bold rounded-xl transition">+</button>
                 </form>

                 <div className="flex flex-wrap gap-2 min-h-[140px] p-4 bg-[#111214] rounded-xl border border-white/5 content-start">
                     {blacklistedWords.length === 0 && <span className="text-gray-600 text-sm italic m-auto">No rules defined.</span>}
                     {blacklistedWords.map((word) => (
                         <div key={word} className="flex items-center gap-1.5 bg-[#18191c] border border-red-500/30 text-red-100 px-3 py-1.5 rounded-lg text-sm font-mono shadow-sm group hover:border-red-500/70 transition-colors">
                             {word}
                             <button onClick={() => removeWord(word)} className="ml-1 opacity-50 hover:opacity-100 text-red-500 cursor-pointer">✕</button>
                         </div>
                     ))}
                 </div>
              </div>

              {/* LIVE SIMULATOR */}
              <div className={`glass-card rounded-2xl p-6 border-2 transition-all ${
                  testMessage === '' ? 'border-white/5 bg-[#0a0a0f]' : 
                  matchedRule ? 'border-red-500 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 
                  'border-emerald-500 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.05)]'
              }`}>
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold text-white uppercase tracking-wider">Live Simulator</h3>
                     {testMessage && (
                        <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${matchedRule ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-black'}`}>
                            {matchedRule ? 'Flagged' : 'Safe'}
                        </div>
                     )}
                 </div>
                 
                 <textarea 
                     rows={3} 
                     value={testMessage}
                     onChange={(e) => setTestMessage(e.target.value)}
                     placeholder="Type a message to test against your filters..." 
                     className="w-full bg-[#111214] border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white focus:outline-none transition resize-y font-mono"
                 ></textarea>

                 {matchedRule && (
                     <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start gap-3">
                         <span className="text-xl">🚨</span>
                         <div>
                             <div className="text-red-400 font-bold text-sm">Message Blocked!</div>
                             <div className="text-red-300 text-xs mt-0.5">Rule triggered: <span className="font-mono bg-[#0a0a0f] px-1.5 py-0.5 rounded ml-1">{matchedRule}</span></div>
                             <div className="text-xs text-gray-400 mt-2 italic">User would receive penalty: {penaltyAction.replace('_', ' ').toUpperCase()}</div>
                         </div>
                     </div>
                 )}
                 {testMessage && !matchedRule && (
                     <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3">
                         <span className="text-xl">✅</span>
                         <span className="text-emerald-400 font-bold text-sm">Valid! This message bypasses all security shields.</span>
                     </div>
                 )}
              </div>
          </div>
      </div>
       
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
