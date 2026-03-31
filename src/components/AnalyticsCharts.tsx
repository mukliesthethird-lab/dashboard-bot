"use client";

import React, { useEffect, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';

interface HistoryData {
    date: string;
    members: number;
    messages: number;
    xp: number;
}

interface AnalyticsChartsProps {
    guildId: string;
}

export default function AnalyticsCharts({ guildId }: AnalyticsChartsProps) {
    const [data, setData] = useState<HistoryData[]>([]);
    const [peakActivity, setPeakActivity] = useState<string>('N/A');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'members' | 'messages' | 'xp'>('members');

    useEffect(() => {
        fetch(`/api/stats?guild_id=${guildId}`)
            .then(res => res.json())
            .then(stats => {
                if (stats.history) {
                    setData(stats.history);
                }
                if (stats.peakActivity) {
                    setPeakActivity(stats.peakActivity);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [guildId]);

    if (loading) {
        return (
            <div className="w-full h-[400px] bg-[#0a0a0f] border border-white/5 rounded-[8px] animate-pulse flex items-center justify-center">
                <div className="text-gray-500 font-bold uppercase tracking-widest">Loading Analytics...</div>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#0f0f16] border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                    <p className="text-gray-400 text-xs font-black uppercase mb-1">{label}</p>
                    <p className="text-white font-bold">
                        {activeTab === 'members' ? '👥 Members: ' : activeTab === 'messages' ? '💬 Messages: ' : '✨ XP: '}
                        <span className={activeTab === 'members' ? 'text-blue-400' : activeTab === 'messages' ? 'text-emerald-400' : 'text-purple-400'}>
                            {payload[0].value.toLocaleString()}
                        </span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const getGradientColor = () => {
        if (activeTab === 'members') return { from: '#3b82f6', to: '#0ea5e9' };
        if (activeTab === 'messages') return { from: '#10b981', to: '#14b8a6' };
        return { from: '#8b5cf6', to: '#6366f1' };
    };

    const gradient = getGradientColor();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-fit">
                    {(['members', 'messages', 'xp'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-lg border border-white/5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Analytics Feed
                </div>
            </div>

            <div className="bg-[#0a0a0f] border border-white/5 rounded-[8px] p-6 shadow-inner relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={gradient.from} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={gradient.from} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 900 }}
                                dy={10}
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                }}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 900 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey={activeTab}
                                stroke={gradient.from}
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0a0a0f] border border-white/5 p-4 rounded-[8px] flex items-center justify-between group">
                    <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Weekly Growth</p>
                        <p className="text-xl font-black text-white">
                            +{data.length > 0 && data[0][activeTab] ? (((data[data.length - 1][activeTab] as number) - (data[0][activeTab] as number)) / (data[0][activeTab] as number) * 100).toFixed(1) : "0"}%
                        </p>
                    </div>
                    <div className="text-2xl opacity-20 group-hover:opacity-100 transition-opacity">📈</div>
                </div>
                <div className="bg-[#0a0a0f] border border-white/5 p-4 rounded-[8px] flex items-center justify-between group">
                    <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Peak Activity</p>
                        <p className="text-xl font-black text-white">
                            {peakActivity}
                        </p>
                    </div>
                    <div className="text-2xl opacity-20 group-hover:opacity-100 transition-opacity">🔥</div>
                </div>
                <div className="bg-[#0a0a0f] border border-white/5 p-4 rounded-[8px] flex items-center justify-between group">
                    <div>
                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Avg per Day</p>
                        <p className="text-xl font-black text-white">
                            {data.length > 0 ? Math.round(((data[data.length - 1][activeTab] as number) - (data[0][activeTab] as number)) / 7) : "0"}
                        </p>
                    </div>
                    <div className="text-2xl opacity-20 group-hover:opacity-100 transition-opacity">⚡</div>
                </div>
            </div>
        </div>
    );
}
