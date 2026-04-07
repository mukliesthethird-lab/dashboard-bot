"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import Toast from "@/components/Toast";

interface Asset {
    id: number;
    symbol: string;
    name: string;
    current_price: number;
    previous_price: number;
    volatility: number;
}

export default function MarketPage() {
    const params = useParams();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [portfolio, setPortfolio] = useState<any[]>([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    
    // Trade state
    const [tradeSymbol, setTradeSymbol] = useState("POLLO");
    const [tradeAmount, setTradeAmount] = useState(1);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/market?action=assets");
            if (res.ok) {
                const data = await res.json();
                setAssets(data.assets);
                setChartData(data.chartData);
                setBalance(data.balance);
            }

            const pRes = await fetch("/api/market?action=portfolio");
            if (pRes.ok) {
                const pData = await pRes.json();
                setPortfolio(pData);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const intv = setInterval(fetchData, 60000); // 1 min update
        return () => clearInterval(intv);
    }, []);

    const executeTrade = async (action: "buy" | "sell") => {
        try {
            const res = await fetch("/api/market", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, symbol: tradeSymbol, amount: tradeAmount })
            });
            const data = await res.json();
            
            if (res.ok) {
                setToast({ message: data.message, type: "success" });
                fetchData();
            } else {
                setToast({ message: data.error, type: "error" });
            }
        } catch (e: any) {
            setToast({ message: e.message || "Failed to execute trade", type: "error" });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const selectedAsset = assets.find(a => a.symbol === tradeSymbol);
    const estValue = selectedAsset ? selectedAsset.current_price * tradeAmount : 0;

    return (
        <div className="space-y-6 pt-16 lg:pt-0 max-w-7xl mx-auto px-4 pb-20">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white">Live Market Trader 💹</h1>
                    <p className="text-gray-400 mt-2">Pantau bursa saham dan mulai investasi aset kripto fantastimu!</p>
                </div>
                <div className="flex items-center gap-3 bg-[#05050a]/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <span className="text-xl">💰</span>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Saldo Koin</p>
                        <p className="text-2xl font-black text-white">{balance.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Asset Marquee / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {assets.map(asset => {
                    const diff = asset.current_price - asset.previous_price;
                    const isUp = diff >= 0;
                    return (
                        <div key={asset.id} className="bg-[#05050a]/40 border border-white/5 p-5 rounded-2xl backdrop-blur-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                {isUp ? '📈' : '📉'}
                            </div>
                            <h3 className="text-lg font-bold text-gray-300">{asset.name} <span className="text-xs px-2 py-1 bg-white/10 rounded-full ml-2">{asset.symbol}</span></h3>
                            <div className="mt-4 flex items-end gap-3">
                                <span className="text-3xl font-black text-white">{asset.current_price.toLocaleString()}</span>
                                <span className={`text-sm font-bold mb-1 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {isUp ? '+' : ''}{diff} ({(diff/asset.previous_price * 100).toFixed(2)}%)
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Graph Area */}
                <div className="lg:col-span-2 bg-[#05050a]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                    <h2 className="text-xl font-bold text-white mb-6">Market History (2 Jam Terakhir)</h2>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" fontSize={12} tickMargin={10} />
                                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} domain={['dataMin - 100', 'dataMax + 100']} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#05050a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="POLLO" stroke="#f1c40f" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="OHIO" stroke="#e74c3c" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="SIGMA" stroke="#9b59b6" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Trading Panel */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-b from-[#0a0a0f] to-[#05050a]/80 border border-indigo-500/20 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none" />
                        
                        <h2 className="text-xl font-bold text-white mb-6">Trade Terminal</h2>
                        
                        <div className="space-y-5 relative z-10">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">Pilih Aset</label>
                                <select 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                                    value={tradeSymbol}
                                    onChange={(e) => setTradeSymbol(e.target.value)}
                                >
                                    {assets.map(a => <option key={a.symbol} value={a.symbol} className="bg-gray-900">{a.symbol} - {a.current_price} koin</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">Jumlah Lembar</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                                    value={tradeAmount}
                                    onChange={(e) => setTradeAmount(parseInt(e.target.value) || 1)}
                                />
                            </div>

                            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Total Estimasi</span>
                                    <span className="text-white font-bold">{estValue.toLocaleString()} Koin</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => executeTrade("buy")}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-xl transition-all active:scale-95"
                                >
                                    BUY
                                </button>
                                <button 
                                    onClick={() => executeTrade("sell")}
                                    className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-black py-4 rounded-xl transition-all active:scale-95"
                                >
                                    SELL
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Portfolio Widget */}
                    <div className="bg-[#05050a]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                        <h2 className="text-lg font-bold text-white mb-4">Portofolio Saya</h2>
                        {portfolio.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 flex flex-col items-center">
                                <span className="text-4xl mb-2">🪹</span>
                                <p>Belum memiliki aset apapun.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {portfolio.map(p => (
                                    <div key={p.asset_id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                        <div>
                                            <p className="font-bold text-white">{p.symbol}</p>
                                            <p className="text-xs text-gray-400">{p.amount_owned} Lembar</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-emerald-400">{(p.amount_owned * p.current_price).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
