"use client";

import Loading from "@/components/Loading";

import { useState, useEffect } from "react";
import CreateMessageModal from "./CreateMessageModal";
import { Channel, Role, ReactionRoleMessage } from "../types";
import CustomDropdown from "./CustomDropdown";
import DashboardHeader from "./DashboardHeader";
import PremiumCard from "./PremiumCard";
import ToastContainer, { useToast } from "./Toast";
interface Feed {
    id: number;
    guild_id: string;
    type: 'youtube' | 'live';
    feed_url: string;
    discord_channel_id: string;
    custom_message_json: any;
    is_enabled: boolean;
}

interface NotificationSettingsProps {
    guildId: string;
}

export default function NotificationSettings({ guildId }: NotificationSettingsProps) {
    const [ytInput, setYtInput] = useState("");
    const [ytChannelId, setYtChannelId] = useState("");
    const [liveInput, setLiveInput] = useState("");
    const [liveChannelId, setLiveChannelId] = useState("");

    // Modal & Data States
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [showEditor, setShowEditor] = useState(false);
    const [editingMsg, setEditingMsg] = useState<ReactionRoleMessage | null>(null);
    const [editingFeedId, setEditingFeedId] = useState<number | null>(null);
    const [activeTarget, setActiveTarget] = useState<"youtube" | "live" | null>(null);
    const [loading, setLoading] = useState(true);

    const { toast, success, error, hideToast } = useToast();

    // Fetch Channels, Roles, and Feeds
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [channelsRes, rolesRes, feedsRes] = await Promise.all([
                    fetch(`/api/welcome?action=channels&guild_id=${guildId}`),
                    fetch(`/api/welcome?action=roles&guild_id=${guildId}`),
                    fetch(`/api/notifications?guild_id=${guildId}`)
                ]);
                const channelsData = await channelsRes.json();
                const rolesData = await rolesRes.json();
                const feedsData = await feedsRes.json();

                if (Array.isArray(channelsData)) setChannels(channelsData);
                if (Array.isArray(rolesData)) setRoles(rolesData);
                if (Array.isArray(feedsData)) setFeeds(feedsData);
            } catch (err) {
                console.error("Failed to load data", err);
                error("Failed to load notification settings");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [guildId]);

    const handleAddFeed = async (type: "youtube" | "live") => {
        const url = type === 'youtube' ? ytInput : liveInput;
        const channelId = type === 'youtube' ? ytChannelId : liveChannelId;

        if (!url || !channelId) {
            error("Please fill in both the URL and target channel!");
            return;
        }

        // --- Platform Validation ---
        const isYT = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('/@');
        const isLivePlatform = url.includes('twitch.tv') || url.includes('kick.com');

        if (type === 'youtube' && !isYT) {
            error("Invalid YouTube URL! Please use a youtube.com or youtu.be link.");
            return;
        }

        if (type === 'live' && isYT && !url.includes('/live')) {
            error("Please put YouTube videos in the YouTube section, not here!");
            return;
        }

        if (type === 'live' && !isLivePlatform && !url.includes('youtube.com/live')) {
            error("Invalid Live Stream URL! Supported: Twitch, Kick, or YouTube Live.");
            return;
        }

        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guild_id: guildId,
                    type,
                    feed_url: url,
                    discord_channel_id: channelId,
                    custom_message_json: null,
                    is_enabled: true
                })
            });

            if (res.ok) {
                success(`${type === 'youtube' ? 'YouTube' : 'Live'} feed added!`);
                if (type === 'youtube') { setYtInput(""); setYtChannelId(""); }
                else { setLiveInput(""); setLiveChannelId(""); }

                // Refresh feeds
                const feedsRes = await fetch(`/api/notifications?guild_id=${guildId}`);
                setFeeds(await feedsRes.json());
            } else {
                error("Failed to add feed");
            }
        } catch (err) {
            error("Something went wrong");
        }
    };

    const handleDeleteFeed = async (id: number) => {
        try {
            const res = await fetch(`/api/notifications?id=${id}&guild_id=${guildId}`, { method: 'DELETE' });
            if (res.ok) {
                setFeeds(feeds.filter(f => f.id !== id));
                success("Feed removed!");
            } else {
                error("Failed to remove feed");
            }
        } catch (err) {
            error("Error deleting feed");
        }
    };

    const handleUpdateChannel = async (id: number, newChannelId: string) => {
        const feed = feeds.find(f => f.id === id);
        if (!feed) return;

        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...feed,
                    custom_message_json: typeof feed.custom_message_json === 'string' && feed.custom_message_json !== 'null'
                        ? JSON.parse(feed.custom_message_json)
                        : (feed.custom_message_json === 'null' ? null : feed.custom_message_json),
                    discord_channel_id: newChannelId
                })
            });

            if (res.ok) {
                setFeeds(feeds.map(f => f.id === id ? { ...f, discord_channel_id: newChannelId } : f));
                success("Target channel updated!");
            } else {
                error("Failed to update channel");
            }
        } catch (err) {
            error("Error updating channel");
        }
    };

    const handleToggleFeed = async (id: number, currentStatus: boolean) => {
        const feed = feeds.find(f => f.id === id);
        if (!feed) return;

        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...feed,
                    custom_message_json: typeof feed.custom_message_json === 'string' && feed.custom_message_json !== 'null'
                        ? JSON.parse(feed.custom_message_json)
                        : (feed.custom_message_json === 'null' ? null : feed.custom_message_json),
                    is_enabled: !currentStatus
                })
            });

            if (res.ok) {
                setFeeds(feeds.map(f => f.id === id ? { ...f, is_enabled: !currentStatus } : f));
            }
        } catch (err) {
            error("Failed to toggle status");
        }
    };

    const GET_DEFAULT_MSG = (type: 'youtube' | 'live'): ReactionRoleMessage => {
        if (type === 'youtube') {
            return {
                message_id: null,
                channel_id: '',
                message_content: '🔔 Hey @everyone, **{channel.name}** baru saja mengunggah video baru!',
                embeds: [{
                    title: '📹 New YouTube Video!',
                    description: '**{channel.name}** baru saja mengunggah video baru!\n\n**[{content.title}]({content.url})**\n\nYuk buruan tonton! 🔥',
                    color: '#FF0000',
                    image_url: '{content.thumbnail}',
                    footer_text: 'Don Pollo Notifications',
                    fields: [],
                    author_name: '',
                    author_icon_url: '',
                    thumbnail_url: '',
                    footer_icon_url: ''
                }],
                component_rows: []
            };
        } else {
            return {
                message_id: null,
                channel_id: '',
                message_content: '🔔 Hey @everyone, **{channel.name}** sedang aktif!',
                embeds: [{
                    title: '🎮 {channel.name} is LIVE!',
                    description: "Don't miss out! **{channel.name}** is streaming **{content.game}** right now!\n\n**[{content.title}]({content.url})**\n\nJoin now! ✨",
                    color: '#9146FF',
                    image_url: '{content.thumbnail}',
                    footer_text: 'Don Pollo Notifications',
                    fields: [],
                    author_name: '',
                    author_icon_url: '',
                    thumbnail_url: '',
                    footer_icon_url: ''
                }],
                component_rows: []
            };
        }
    };

    const openEditor = (feed: Feed) => {
        setActiveTarget(feed.type);
        setEditingFeedId(feed.id);

        let initialMsg = feed.custom_message_json;
        if (typeof initialMsg === 'string' && initialMsg !== 'null') {
            initialMsg = JSON.parse(initialMsg);
        }

        // If no custom message exists, use the premium default
        if (!initialMsg || initialMsg === 'null') {
            initialMsg = GET_DEFAULT_MSG(feed.type);
        }

        // Sync channel_id for variable preview/validation
        if (initialMsg) {
            initialMsg = { ...initialMsg, channel_id: feed.discord_channel_id };
        }

        setEditingMsg(initialMsg);
        setShowEditor(true);
    };

    const handleSaveMessage = async (msg: ReactionRoleMessage) => {
        if (!editingFeedId) return;
        const feed = feeds.find(f => f.id === editingFeedId);
        if (!feed) return;

        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...feed,
                    custom_message_json: msg
                })
            });

            if (res.ok) {
                success("Custom message saved!");
                setFeeds(feeds.map(f => f.id === editingFeedId ? { ...f, custom_message_json: msg } : f));
                setShowEditor(false);
            } else {
                error("Failed to save message");
            }
        } catch (err) {
            error("Error saving message");
        }
    };

    const NOTIFICATION_VARIABLES = [
        { category: 'Notification', variable: '{content.title}', description: 'Judul video atau stream', preview: 'Makan Ayam Goreng Don Pollo' },
        { category: 'Notification', variable: '{content.url}', description: 'URL video atau stream', preview: 'https://youtu.be/...' },
        { category: 'Notification', variable: '{channel.name}', description: 'Nama channel YouTube atau platform', preview: 'Don Pollo' },
        { category: 'Notification', variable: '{content.game}', description: 'Nama game yang dimainkan (Live)', preview: 'GTA V' },
        { category: 'Notification', variable: '{content.thumbnail}', description: 'Thumbnail video/stream', preview: '🖼️ Image' },
        { category: 'Server', variable: '{server}', description: 'Nama server Discord', preview: 'My Server' },
    ];

    if (loading) {
        return <Loading message="Loading notification settings..." />;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {/* YouTube Content */}
                <div className="bg-[var(--bg-primary)] rounded-[8px] border border-[var(--border)] overflow-hidden flex flex-col shadow-lg">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/30 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[8px] bg-[#da373c]/10 flex items-center justify-center text-[#da373c]">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-bold text-lg leading-tight">YouTube Content</h3>
                                <span className="text-[10px] bg-[var(--bg-elevated)]merald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter animate-pulse">Real-time</span>
                            </div>
                            <p className="text-[var(--text-secondary)] text-xs">Broadcast via WebSub (PubSubHubbub)</p>
                        </div>
                    </div>
                    <div className="p-4 space-y-6">
                        {/* Add Form */}
                        <div className="bg-[var(--bg-tertiary)] p-4 rounded-[8px] border border-[var(--border)]">
                            <h4 className="text-[10px] font-bold text-[#da373c] uppercase tracking-widest mb-4">Add New Channel</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">YouTube URL or ID</label>
                                    <input
                                        type="text"
                                        value={ytInput}
                                        onChange={(e) => setYtInput(e.target.value)}
                                        placeholder="https://youtube.com/@handle or UC..."
                                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] focus:border-[#5865F2] rounded-[3px] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-all"
                                    />
                                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1 italic">Automatically resolves handle to Channel ID</p>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Discord Channel</label>
                                    <CustomDropdown
                                        value={ytChannelId}
                                        onChange={(val) => setYtChannelId(val)}
                                        options={[
                                            { value: '', label: 'Select Channel...' },
                                            ...channels.map(c => ({ value: c.id, label: `#${c.name}` }))
                                        ]}
                                        placeholder="Select Channel..."
                                    />
                                </div>
                                <button
                                    onClick={() => handleAddFeed('youtube')}
                                    className="w-full py-2.5 bg-[#248046] hover:bg-[#1a6334] text-white text-xs font-black uppercase tracking-tight rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-emerald-900/20"
                                >
                                    <span>➕</span> Add YouTube Feed
                                </button>
                            </div>
                        </div>

                        {/* Saved List */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-[#da373c] rounded-full animate-pulse"></span>
                                Currently Tracking
                            </h4>
                            <div className="space-y-2">
                                {feeds.filter(f => f.type === 'youtube').map(feed => (
                                    <div key={feed.id} className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[8px] p-3 flex items-center justify-between group/item hover:border-[#4e5058] transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-white truncate max-w-[150px]">{feed.feed_url.split('/').pop()}</p>
                                                <span className="text-[10px] bg-[#da373c]/10 text-[#da373c] px-1.5 py-0.5 rounded-[3px] font-bold">YT</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Target:</span>
                                                <div className="w-40">
                                                    <CustomDropdown
                                                        value={feed.discord_channel_id}
                                                        onChange={(val) => handleUpdateChannel(feed.id, val)}
                                                        options={channels.map(c => ({ value: c.id, label: `#${c.name}` }))}
                                                        size="sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => openEditor(feed)}
                                                className="p-1.5 hover:bg-[var(--bg-hover)] rounded-[3px] text-[var(--text-secondary)] hover:text-white transition-colors"
                                                title="Edit Message"
                                            >
                                                ⚙️
                                            </button>
                                            <div
                                                onClick={() => handleToggleFeed(feed.id, feed.is_enabled)}
                                                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${feed.is_enabled ? 'bg-[#248046]' : 'bg-[var(--bg-hover)]'}`}
                                            >
                                                <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-transform ${feed.is_enabled ? 'left-[18px]' : 'left-[2px]'}`} />
                                            </div>
                                            <button
                                                onClick={() => handleDeleteFeed(feed.id)}
                                                className="p-1.5 hover:bg-[#da373c]/10 rounded-[3px] text-[var(--text-secondary)] hover:text-[#da373c] transition-colors"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {feeds.filter(f => f.type === 'youtube').length === 0 && (
                                    <p className="text-xs text-center text-[#87898c] py-4 italic border border-dashed border-[#4e5058] rounded-[8px]">No feeds tracked yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Streams */}
                <div className="bg-[var(--bg-primary)] rounded-[8px] border border-[var(--border)] overflow-hidden flex flex-col shadow-lg">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/30 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[8px] bg-[#5865f2]/10 flex items-center justify-center text-[#5865f2]">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0h1.714v5.143h-1.714zM4.714 0L1.714 3v15.429h5.143v4.285l4.286-4.285h3.428L22.286 12V0zm15.857 11.142l-3.428 3.429h-3.429l-3 3v-3H6.857V1.714h13.714z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-tight">Live Streams</h3>
                            <p className="text-[var(--text-secondary)] text-xs">Broadcast when you go live</p>
                        </div>
                    </div>
                    <div className="p-4 space-y-6">
                        {/* Add Form */}
                        <div className="bg-[var(--bg-tertiary)] p-4 rounded-[8px] border border-[var(--border)]">
                            <h4 className="text-[10px] font-bold text-[#5865f2] uppercase tracking-widest mb-4">Add New Stream</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Platform URL</label>
                                    <input
                                        type="text"
                                        value={liveInput}
                                        onChange={(e) => setLiveInput(e.target.value)}
                                        placeholder="https://twitch.tv/donpollo"
                                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] focus:border-[#5865F2] rounded-[3px] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Discord Channel</label>
                                    <CustomDropdown
                                        value={liveChannelId}
                                        onChange={(val) => setLiveChannelId(val)}
                                        options={[
                                            { value: '', label: 'Select Channel...' },
                                            ...channels.map(c => ({ value: c.id, label: `#${c.name}` }))
                                        ]}
                                        placeholder="Select Channel..."
                                    />
                                </div>
                                <button
                                    onClick={() => handleAddFeed('live')}
                                    className="w-full py-2.5 bg-[#248046] hover:bg-[#1a6334] text-white text-xs font-black uppercase tracking-tight rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-emerald-900/20"
                                >
                                    <span>➕</span> Add Live Feed
                                </button>
                            </div>
                        </div>

                        {/* Saved List */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-[#5865f2] rounded-full animate-pulse"></span>
                                Currently Tracking
                            </h4>
                            <div className="space-y-2">
                                {feeds.filter(f => f.type === 'live').map(feed => (
                                    <div key={feed.id} className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[8px] p-3 flex items-center justify-between group/item hover:border-[#4e5058] transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-white truncate max-w-[150px]">{feed.feed_url.split('/').pop()}</p>
                                                <span className="text-[10px] bg-[#5865f2]/10 text-[#5865f2] px-1.5 py-0.5 rounded-[3px] font-bold">LIVE</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Target:</span>
                                                <div className="w-40">
                                                    <CustomDropdown
                                                        value={feed.discord_channel_id}
                                                        onChange={(val) => handleUpdateChannel(feed.id, val)}
                                                        options={channels.map(c => ({ value: c.id, label: `#${c.name}` }))}
                                                        size="sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => openEditor(feed)}
                                                className="p-1.5 hover:bg-[var(--bg-hover)] rounded-[3px] text-[var(--text-secondary)] hover:text-white transition-colors"
                                                title="Edit Message"
                                            >
                                                ⚙️
                                            </button>
                                            <div
                                                onClick={() => handleToggleFeed(feed.id, feed.is_enabled)}
                                                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${feed.is_enabled ? 'bg-[#248046]' : 'bg-[var(--bg-hover)]'}`}
                                            >
                                                <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-transform ${feed.is_enabled ? 'left-[18px]' : 'left-[2px]'}`} />
                                            </div>
                                            <button
                                                onClick={() => handleDeleteFeed(feed.id)}
                                                className="p-1.5 hover:bg-[#da373c]/10 rounded-[3px] text-[var(--text-secondary)] hover:text-[#da373c] transition-colors"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {feeds.filter(f => f.type === 'live').length === 0 && (
                                    <p className="text-xs text-center text-[#87898c] py-4 italic border border-dashed border-[#4e5058] rounded-[8px]">No feeds tracked yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Coming Soon / More Platforms */}
                <div className="md:col-span-2 group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#5865f2] to-[#4e5058] rounded-[8px] blur opacity-5 group-hover:opacity-10 transition duration-500" />
                    <div className="relative bg-[var(--bg-primary)] border border-dashed border-[var(--border)] p-8 rounded-[8px] flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <h4 className="text-xl font-bold text-white">More Platforms Coming Soon</h4>
                        <p className="text-[var(--text-secondary)] mt-2 max-w-sm">We're working on integrating TikTok, X (Twitter), and Instagram feeds into your dashboard.</p>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <CreateMessageModal
                isOpen={showEditor}
                onClose={() => {
                    setShowEditor(false);
                    setEditingFeedId(null);
                }}
                initialMessage={editingMsg}
                isEditing={editingMsg !== null}
                channels={channels}
                roles={roles}
                onSave={handleSaveMessage}
                guildId={guildId}
                saveLabel="Apply Custom Message"
                extraVariables={NOTIFICATION_VARIABLES}
                disableChannelSelect={true}
            />

            <ToastContainer toast={toast} onClose={hideToast} />
        </div>
    );
}


