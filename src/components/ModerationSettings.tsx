"use client";

import { useState } from "react";
import Link from "next/link";

interface ModerationSettingsProps {
    guildId: string;
}

export default function ModerationSettings({ guildId }: ModerationSettingsProps) {
    // Mock States for UI demo
    const [userNotifications, setUserNotifications] = useState(true);
    const [purgePinned, setPurgePinned] = useState(true);

    const menuItems = [
        { icon: "⚖️", title: "Appeals", desc: "Create custom forms for users to appeal their punishments.", isNew: true },
        { icon: "🔨", title: "Punish settings", desc: "Edit ban, kick, mute and warn actions, default values and more." },
        { icon: "🛡️", title: "Immune roles", desc: "Set roles that are immune to moderation actions." },
        {
            icon: "🔔",
            title: "User notifications",
            desc: "Toggle direct messages on punishments.",
            isToggle: true,
            checked: userNotifications,
            onToggle: () => setUserNotifications(!userNotifications)
        },
        { icon: "📋", title: "Predefined reasons", desc: "Define reason aliases for punishments." },
        { icon: "🔒", title: "Channel locking", desc: "Lock channels to prevent users from sending messages or joining voice channels." },
        { icon: "👁️", title: "Privacy", desc: "Decide what case information is shown to users." },
        {
            icon: "📌",
            title: "Purge pinned messages",
            desc: "Keep pinned messages when purging channel history.",
            isToggle: true,
            checked: purgePinned,
            onToggle: () => setPurgePinned(!purgePinned)
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header Section */}
            <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-stone-800 mb-2">Moderation System</h1>
                    <p className="text-stone-500 text-lg max-w-2xl">
                        Manage automated moderation, cases, and punishments to keep your server safe.
                    </p>
                </div>
            </div>

            {/* Top Cards: Cases & Reports */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cases Card */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col justify-between hover:shadow-md transition group">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
                                📂
                            </div>
                            <h2 className="text-xl font-bold text-stone-800">Cases</h2>
                        </div>
                        <p className="text-stone-500 mb-6">Manage all ban, kick, mute and warn cases.</p>
                    </div>
                    <Link href={`/dashboard/${guildId}/moderation/cases`}>
                        <button className="self-start px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2">
                            View cases
                        </button>
                    </Link>
                </div>

                {/* User Reports Card */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col justify-between hover:shadow-md transition group">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-xl">
                                🚩
                            </div>
                            <h2 className="text-xl font-bold text-stone-800">User reports</h2>
                        </div>
                        <p className="text-stone-500 mb-6">Manage incoming reports from your community.</p>
                    </div>
                    <Link href={`/dashboard/${guildId}/moderation/reports`}>
                        <button className="self-start px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2">
                            View reports
                        </button>
                    </Link>
                </div>
            </div>

            {/* Menu List */}
            <div className="flex flex-col gap-4">
                {menuItems.map((item, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer flex items-center gap-5 group"
                    >
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-2xl bg-stone-50 group-hover:bg-amber-100 text-stone-600 group-hover:text-amber-600 flex items-center justify-center text-2xl transition-colors">
                            {item.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-stone-800 group-hover:text-amber-700 transition-colors">
                                    {item.title}
                                </h3>
                                {item.isNew && (
                                    <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                                        New
                                    </span>
                                )}
                            </div>
                            <p className="text-stone-400 font-medium text-sm">{item.desc}</p>
                        </div>

                        {/* Action / Arrow */}
                        <div>
                            {item.isToggle ? (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.onToggle) item.onToggle();
                                    }}
                                    className={`w-14 h-8 rounded-full relative transition-colors duration-300 cursor-pointer ${item.checked ? 'bg-green-500' : 'bg-stone-200'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${item.checked ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-stone-50 group-hover:bg-amber-400 group-hover:text-white text-stone-400 flex items-center justify-center transition-all">
                                    <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
