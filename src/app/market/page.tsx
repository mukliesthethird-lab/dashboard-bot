"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight, ArrowDownRight, BarChart2, Zap, Wallet, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import type { TradingChartHandle } from "@/components/TradingChart";

const TradingChart = dynamic(() => import("@/components/TradingChart"), { ssr: false });

const TICK_INTERVAL = 1500; // Turbo mode: Poll every 1.5s

export default function ProMarketTerminal() {
    const { data: session } = useSession();
    const [isClient, setIsClient] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [assets, setAssets] = useState<any[]>([]);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [priceDiff, setPriceDiff] = useState(0);
    const [orderBook, setOrderBook] = useState<{ bids: any[], asks: any[] }>({ bids: [], asks: [] });
    const [recentTrades, setRecentTrades] = useState<any[]>([]);
    const [userStats, setUserStats] = useState<{ balance: number, portfolio: any[] }>({ balance: 0, portfolio: [] });
    
    // Trade Input State
    const [tradeAmount, setTradeAmount] = useState<string>("10");
    const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
    const [trading, setTrading] = useState(false);
    const [tradeMsg, setTradeMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const chartRef = useRef<TradingChartHandle>(null);
    const lastFetchRef = useRef<Record<string, any[]>>({});
    const isFirstRun = useRef(true);

    const generateOrderBook = (price: number) => {
        const asks = [];
        const bids = [];
        for (let i = 0; i < 8; i++) {
            bids.push({ price: +(price - (price * 0.0005) * (i+1)).toFixed(2), size: Math.floor(Math.random() * 200) + 10 });
            asks.push({ price: +(price + (price * 0.0005) * (i+1)).toFixed(2), size: Math.floor(Math.random() * 200) + 10 });
        }
        setOrderBook({ bids, asks: asks.reverse() });
    };

    const generateTrade = (price: number) => {
        const type = Math.random() > 0.5 ? 'buy' : 'sell';
        const size = Math.floor(Math.random() * 50) + 1;
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: 'numeric', minute:'numeric', second:'numeric' });
        setRecentTrades(prev => [{ id: Math.random(), price: +price.toFixed(2), size, time, type }, ...prev].slice(0, 10));
    };

    const fetchMarketData = async () => {
        try {
            const res = await fetch('/api/market/ticker');
            const data = await res.json();
            if (data.success) {
                setAssets(data.assets);
                if (data.user) setUserStats(data.user);
                
                // Track candles for sync
                if (data.candles) {
                    lastFetchRef.current = data.candles;
                    
                    // Update active chart and price if selected
                    if (selectedAsset) {
                        const assetData = data.assets.find((a: any) => a.symbol === selectedAsset.symbol);
                        const assetCandles = data.candles[selectedAsset.symbol];
                        
                        if (assetData) {
                            const newPrice = Number(assetData.current_price);
                            setCurrentPrice(newPrice);
                            setPriceDiff(+(newPrice - Number(assetData.previous_price)).toFixed(2));
                            
                            if (isFirstRun.current) {
                                generateOrderBook(newPrice);
                                generateTrade(newPrice);
                            } else {
                                if (Math.random() > 0.7) generateOrderBook(newPrice);
                                if (Math.random() > 0.8) generateTrade(newPrice);
                            }
                        }

                        if (assetCandles && assetCandles.length > 0 && chartRef.current) {
                            // On the very first run, we set the full history
                            // Subsequent runs, we just let the chart handle the data update
                            // Note: if user just opened or switched, we might need full data
                        }
                    }
                }
                return data;
            }
        } catch (e) {
            console.error('Fetch data error:', e);
        }
    };

    // Initialize State
    useEffect(() => {
        setIsClient(true);
        const init = async () => {
            const data = await fetchMarketData();
            if (data && data.assets) {
                const first = data.assets[0];
                setSelectedAsset(first);
                isFirstRun.current = false;
                setLoaded(true);
            }
        };
        init();
    }, []);

    // Global Sync Ticker
    useEffect(() => {
        if (isFirstRun.current) return;

        const interval = setInterval(async () => {
            await fetchMarketData();
        }, TICK_INTERVAL);

        return () => clearInterval(interval);
    }, [selectedAsset]);

    // Handle Asset Switch (Instant UI Reset)
    useEffect(() => {
        if (!selectedAsset || isFirstRun.current) return;
        
        // 1. Update Header & Price immediately from existing assets list
        const latest = assets.find(a => a.symbol === selectedAsset.symbol);
        if (latest) {
            const price = Number(latest.current_price);
            setCurrentPrice(price);
            setPriceDiff(+(price - Number(latest.previous_price)).toFixed(2));
            generateOrderBook(price);
        }
        
        // 2. Refresh Chart
        if (chartRef.current && lastFetchRef.current[selectedAsset.symbol]) {
            chartRef.current.setData(lastFetchRef.current[selectedAsset.symbol]);
        }
        
        // 3. Reset internal states
        setTradeMsg(null);
        setRecentTrades([]);
    }, [selectedAsset]);

    // Handle Global Data Sync to Chart
    useEffect(() => {
        if (!selectedAsset || !chartRef.current || !lastFetchRef.current[selectedAsset.symbol]) return;
        
        const myCandles = lastFetchRef.current[selectedAsset.symbol];
        if (myCandles && myCandles.length > 0) {
            chartRef.current.setData(myCandles);
        }
    }, [assets]); // Sync when assets list updates (every 1.5s)

    if (!isClient) return null;

    const handleTradeAction = async () => {
        if (!session || trading || !selectedAsset) return;
        setTrading(true);
        setTradeMsg(null);
        try {
            const res = await fetch('/api/market/trade', {
                method: 'POST',
                body: JSON.stringify({
                    symbol: selectedAsset.symbol,
                    amount: Number(tradeAmount),
                    type: tradeType
                })
            });
            const data = await res.json();
            if (data.success) {
                setTradeMsg({ type: 'success', text: data.message });
                await fetchMarketData();
            } else {
                setTradeMsg({ type: 'error', text: data.error });
            }
        } catch (e) {
            setTradeMsg({ type: 'error', text: 'Transaction failed' });
        } finally {
            setTrading(false);
            setTimeout(() => setTradeMsg(null), 3000);
        }
    };

    const ownedAmount = userStats.portfolio.find(p => p.symbol === selectedAsset?.symbol)?.amount_owned || 0;
    const isUp = priceDiff >= 0;

    return (
        <div className="min-h-screen bg-[#020204] text-white flex flex-col font-mono tracking-tight">
            <main className="flex-1 pt-24 pb-6 px-4 md:px-6 mx-auto w-full max-w-[1600px] flex gap-4 h-[calc(100vh-80px)] overflow-hidden">
                
                {/* LEFT: MARKETS */}
                <div className="w-[280px] hidden xl:flex flex-col gap-4">
                    <div className="bg-[#0b0c10] border border-white/5 rounded-2xl flex-1 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <span className="flex items-center gap-2 font-bold text-xs"><BarChart2 className="w-4 h-4 text-indigo-500" /> Markets</span>
                            <span className="text-[10px] text-gray-500">Live</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {assets.map(asset => {
                                const aCurr = Number(asset.current_price);
                                const aPrev = Number(asset.previous_price);
                                const aUp = (aCurr - aPrev) >= 0;

                                return (
                                    <button 
                                        key={asset.symbol}
                                        onClick={() => setSelectedAsset(asset)}
                                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${
                                            selectedAsset?.symbol === asset.symbol 
                                            ? 'bg-indigo-500/10 border border-indigo-500/30' 
                                            : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                    >
                                        <div>
                                            <div className="font-black text-xs">{asset.symbol}/COIN</div>
                                            <div className="text-[10px] text-gray-500">{asset.name.split(' ')[0]}</div>
                                        </div>
                                        <div className={`font-bold text-sm ${aUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {aCurr.toLocaleString()}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* MIDDLE: CHART */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <div className="bg-[#0b0c10] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl border shrink-0 bg-white/5 border-white/10">
                                    {selectedAsset?.symbol?.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-xl font-black">{selectedAsset?.symbol}/COIN</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">{selectedAsset?.name}</div>
                                </div>
                            </div>
                            
                            <div className="h-8 w-px bg-white/10 hidden md:block"></div>
                            
                            <div className="hidden sm:block">
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Live Price (Synced)</p>
                                <p className={`text-xl font-black ${isUp ? 'text-emerald-400' : 'text-red-400'} tabular-nums`}>
                                    {currentPrice.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-bold">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></div>
                            CONNECTED TO MAINNET
                        </div>
                    </div>

                    <div className="bg-[#0b0c10] border border-white/5 rounded-2xl flex-1 relative overflow-hidden flex flex-col">
                        <div className="flex-1 w-full relative">
                            {loaded && selectedAsset && (
                                <TradingChart 
                                    ref={chartRef}
                                    data={[]} // Will be populated by the secondary useEffect once candles arrive
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: TRADING PANEL */}
                <div className="w-[300px] hidden lg:flex flex-col gap-4">
                    <div className="bg-[#0b0c10] border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                            <button 
                                onClick={() => setTradeType('buy')}
                                className={`flex-1 py-2 rounded-lg text-xs font-black transition ${tradeType === 'buy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-500 hover:text-white'}`}
                            >BUY</button>
                            <button 
                                onClick={() => setTradeType('sell')}
                                className={`flex-1 py-2 rounded-lg text-xs font-black transition ${tradeType === 'sell' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-500 hover:text-white'}`}
                            >SELL</button>
                        </div>

                        <div className="space-y-4">
                            {!session ? (
                                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center space-y-3">
                                    <Zap className="w-10 h-10 text-indigo-400 mx-auto" />
                                    <p className="text-xs font-bold text-indigo-200">Connect Discord to Trade</p>
                                    <button onClick={() => window.location.href = '/api/auth/signin'} className="w-full py-2 bg-indigo-500 rounded-lg text-xs font-bold">SIGN IN</button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-bold text-gray-500 px-1">
                                            <span>AMOUNT (Lembar)</span>
                                            <span>Owned: {ownedAmount}</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            value={tradeAmount} 
                                            onChange={(e) => setTradeAmount(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold focus:border-indigo-500/50 outline-none transition"
                                        />
                                    </div>

                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-2">
                                        <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                                            <span>ESTIMATED {tradeType.toUpperCase()} PRICE</span>
                                            <span className="text-white">{(Number(tradeAmount) * currentPrice).toLocaleString()} Koin</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                                            <span>YOUR BALANCE</span>
                                            <span className="text-emerald-400 flex items-center gap-1"><Wallet className="w-3 h-3" /> {userStats.balance.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <button 
                                        disabled={trading}
                                        onClick={handleTradeAction}
                                        className={`w-full py-3 rounded-xl font-black text-sm transition shadow-lg ${
                                            trading ? 'opacity-50 cursor-not-allowed' :
                                            tradeType === 'buy' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
                                        }`}
                                    >
                                        {trading ? 'PROCESSING...' : `CONFIRM ${tradeType.toUpperCase()}`}
                                    </button>

                                    <AnimatePresence>
                                        {tradeMsg && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className={`p-2 rounded-lg text-[10px] font-bold text-center ${tradeMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500'}`}
                                            >
                                                {tradeMsg.text}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Pro Order Book */}
                    <div className="bg-[#0b0c10] border border-white/5 rounded-2xl flex-1 flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase flex justify-between">
                            <span>Price (Koin)</span>
                            <span>Amount</span>
                        </div>
                        <div className="flex-1 p-2 flex flex-col justify-between text-[10px] overflow-hidden">
                            <div className="flex flex-col-reverse gap-0.5 justify-end flex-1">
                                {orderBook.asks.map((ask, i) => (
                                    <div key={`ask-${i}`} className="flex justify-between items-center group h-4 relative">
                                        <div className="absolute right-0 h-full bg-red-500/5 transition-all duration-300" style={{ width: `${(ask.size / 200) * 100}%` }}></div>
                                        <span className="text-red-400 z-10">{ask.price}</span>
                                        <span className="text-gray-500 z-10">{ask.size}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="py-2 border-y border-white/5 text-center bg-white/5 my-1">
                                <span className={`font-black ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>{currentPrice.toLocaleString()}</span>
                                <span className="text-[8px] text-gray-500 block">LAST TRADED</span>
                            </div>
                            <div className="flex flex-col gap-0.5 flex-1">
                                {orderBook.bids.map((bid, i) => (
                                    <div key={`bid-${i}`} className="flex justify-between items-center group h-4 relative">
                                        <div className="absolute right-0 h-full bg-emerald-500/5 transition-all duration-300" style={{ width: `${(bid.size / 200) * 100}%` }}></div>
                                        <span className="text-emerald-400 z-10">{bid.price}</span>
                                        <span className="text-gray-500 z-10">{bid.size}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
