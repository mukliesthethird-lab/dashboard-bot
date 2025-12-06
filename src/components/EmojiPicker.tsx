"use client";

import { useState, useRef, useEffect } from "react";

interface EmojiPickerProps {
    value: string;
    onChange: (emoji: string) => void;
    className?: string;
}

// Popular emoji categories
const EMOJI_CATEGORIES = {
    "😀 Smileys": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐"],
    "👋 Gestures": ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "💪", "🦾", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄"],
    "❤️ Hearts": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "💌", "💋", "💍", "💎"],
    "🎮 Gaming": ["🎮", "🕹️", "👾", "🎲", "🃏", "🎴", "🎯", "🎰", "🧩", "♟️", "🎭", "🎪", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🎷", "🎺", "🎸", "🪕", "🎻", "🥁"],
    "⭐ Symbols": ["⭐", "🌟", "✨", "💫", "🔥", "💥", "💢", "💦", "💨", "🕳️", "💣", "💬", "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "📢", "📣", "📯", "🔔", "🔕", "🎵", "🎶", "✅", "❌", "❓", "❗", "⚠️", "🚫", "⛔", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤"],
    "🍕 Food": ["🍕", "🍔", "🍟", "🌭", "🥪", "🌮", "🌯", "🥙", "🧆", "🥚", "🍳", "🥘", "🍲", "🥣", "🥗", "🍿", "🧈", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🥡", "🦀", "🦞", "🦐", "🦑", "🦪", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯"],
    "🐶 Animals": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄"],
};

export default function EmojiPicker({ value, onChange, className = "" }: EmojiPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (emoji: string) => {
        onChange(emoji);
        setIsOpen(false);
        setSearch("");
    };

    // Filter emojis by search
    const filteredEmojis = search
        ? Object.values(EMOJI_CATEGORIES).flat().filter(e => e.includes(search))
        : EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES] || [];

    return (
        <div className={`relative ${className}`} ref={pickerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-10 flex items-center justify-center text-xl bg-white border-2 border-stone-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition cursor-pointer"
            >
                {value || "😀"}
            </button>

            {/* Picker Dropdown */}
            {isOpen && (
                <div className="absolute z-50 top-12 left-0 w-80 bg-stone-800 rounded-xl shadow-2xl border border-stone-700 overflow-hidden">
                    {/* Search */}
                    <div className="p-3 border-b border-stone-700">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search emojis..."
                            className="w-full px-3 py-2 bg-stone-700 text-white rounded-lg text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            autoFocus
                        />
                    </div>

                    {/* Category Tabs */}
                    {!search && (
                        <div className="flex gap-1 px-2 py-2 border-b border-stone-700 overflow-x-auto">
                            {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-2 py-1 rounded text-lg transition whitespace-nowrap ${activeCategory === cat
                                            ? "bg-amber-500/30 text-amber-400"
                                            : "hover:bg-stone-700 text-stone-400"
                                        }`}
                                >
                                    {cat.split(" ")[0]}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Emoji Grid */}
                    <div className="p-2 max-h-64 overflow-y-auto">
                        {!search && (
                            <div className="text-xs text-stone-400 font-bold mb-2 px-1">
                                {activeCategory}
                            </div>
                        )}
                        <div className="grid grid-cols-8 gap-1">
                            {filteredEmojis.map((emoji, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelect(emoji)}
                                    className="w-8 h-8 flex items-center justify-center text-xl hover:bg-stone-700 rounded transition"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        {filteredEmojis.length === 0 && (
                            <p className="text-stone-400 text-center py-4 text-sm">No emojis found</p>
                        )}
                    </div>

                    {/* Custom Input */}
                    <div className="p-3 border-t border-stone-700 flex gap-2">
                        <input
                            type="text"
                            placeholder="Or type custom emoji..."
                            className="flex-1 px-3 py-2 bg-stone-700 text-white rounded-lg text-sm placeholder-stone-400 focus:outline-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSelect((e.target as HTMLInputElement).value);
                                }
                            }}
                        />
                        <button
                            onClick={() => {
                                const input = pickerRef.current?.querySelector('input[type="text"]:last-of-type') as HTMLInputElement;
                                if (input?.value) handleSelect(input.value);
                            }}
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm"
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
