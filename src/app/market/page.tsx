"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
    BarChart2, Zap, Wallet, X, AlertTriangle,
    ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Clock,
    RefreshCw
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import type { TradingChartHandle } from "@/components/TradingChart";

const TradingChart = dynamic(() => import("@/components/TradingChart"), { ssr: false });

const TICK_INTERVAL = 1000; // Poll every 1s to match hyper-active simulator

const SENTIMENT_CFG: Record<string, { label: string; color: string; bg: string }> = {
    bullish: { label: 'BULL', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    bearish: { label: 'BEAR', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
    neutral: { label: 'NEU',  color: 'text-[var(--text-tertiary)]',    bg: 'bg-white/5 border-[var(--border)]' },
};

interface PortfolioPosition {
    symbol: string; name: string; asset_id: number;
    amount_owned: number; avg_buy_price: number; current_price: number;
    current_value: number; total_invested: number;
    unrealized_pnl: number; unrealized_pnl_pct: number;
}

export default function ProMarketTerminal() {
    const { data: session } = useSession();
    const [isClient, setIsClient] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Market data
    const [assets, setAssets] = useState<any[]>([]);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [priceDiff, setPriceDiff] = useState(0);
    const [orderBook, setOrderBook] = useState<{ bids: any[]; asks: any[] }>({ bids: [], asks: [] });
    const [recentTrades, setRecentTrades] = useState<any[]>([]);
    const [userStats, setUserStats] = useState<{ balance: number; portfolio: PortfolioPosition[] }>({ balance: 0, portfolio: [] });

    // Market state
    const [crashedAssets, setCrashedAssets] = useState<Set<string>>(new Set());
    const [sentimentMap, setSentimentMap] = useState<Record<string, string>>({});
    const [dytoDirection, setDytoDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
    const [resetting, setResetting] = useState(false);

    // Market Order
    const [tradeAmount, setTradeAmount] = useState('1');
    const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
    const [trading, setTrading] = useState(false);
    const [tradeMsg, setTradeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Limit Order
    const [rightTab, setRightTab] = useState<'trade' | 'limit' | 'orders'>('trade');
    const [limitMinPrice, setLimitMinPrice] = useState('');
    const [limitMaxPrice, setLimitMaxPrice] = useState('');
    const [limitAmount, setLimitAmount] = useState('1');
    const [openOrders, setOpenOrders] = useState<any[]>([]);
    const [limitMsg, setLimitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [submittingLimit, setSubmittingLimit] = useState(false);

    const chartRef = useRef<TradingChartHandle>(null);
    const lastFetchRef = useRef<Record<string, any[]>>({});
    const isFirstRun = useRef(true);

    // ── HELPERS ─────────────────────────────────────────────────────────────

    const generateOrderBook = (price: number) => {
        const asks: any[] = [], bids: any[] = [];
        for (let i = 0; i < 8; i++) {
            bids.push({ price: +(price - price * 0.0005 * (i + 1)).toFixed(2), size: Math.floor(Math.random() * 200) + 10 });
            asks.push({ price: +(price + price * 0.0005 * (i + 1)).toFixed(2), size: Math.floor(Math.random() * 200) + 10 });
        }
        setOrderBook({ bids, asks: asks.reverse() });
    };

    const generateTrade = (price: number) => {
        const type = Math.random() > 0.5 ? 'buy' : 'sell';
        const size = Math.floor(Math.random() * 50) + 1;
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        setRecentTrades(prev => [{ id: Math.random(), price: +price.toFixed(2), size, time, type }, ...prev].slice(0, 10));
    };

    // ── DATA FETCHING ────────────────────────────────────────────────────────

    const fetchOrders = async () => {
        if (!session) return;
        try {
            const res = await fetch(`/api/market/orders?type=open&v=${Date.now()}`);
            const data = await res.json();
            if (data.success) setOpenOrders(data.orders || []);
        } catch {}
    };


    const handleResetChart = async () => {
        if (resetting) return;
        setResetting(true);
        try {
            await fetch('/api/market/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset' }),
            });
            // Trigger re-seed by fetching ticker
            setTimeout(async () => {
                const data = await fetchMarketData();
                if (data?.candles && selectedAsset) {
                    const sym = selectedAsset.symbol;
                    if (data.candles[sym]?.length > 0) {
                        chartRef.current?.setData(data.candles[sym]);
                    }
                }
                setResetting(false);
            }, 800);
        } catch {
            setResetting(false);
        }
    };

    const fetchMarketData = async () => {
        try {
            const res = await fetch('/api/market/ticker');
            const data = await res.json();
            if (!data.success) return;

            setAssets(data.assets);
            if (data.user) setUserStats(data.user);

            // Update sentiment + crash state from asset data
            const newSentiments: Record<string, string> = {};
            const newCrashed = new Set<string>();
            for (const a of data.assets) {
                newSentiments[a.symbol] = a.sentiment || 'neutral';
                if (Number(a.crash_mode) === 1) newCrashed.add(a.symbol);
            }
            setSentimentMap(newSentiments);
            setCrashedAssets(newCrashed);

            // Update DYTO Correlation state
            const dyto = data.assets.find((a: any) => a.symbol === 'DYTO');
            if (dyto) {
                const diff = Number(dyto.current_price) - Number(dyto.previous_price);
                const pct = (diff / Number(dyto.previous_price)) * 100;
                if (pct > 0.2) setDytoDirection('up');
                else if (pct < -0.2) setDytoDirection('down');
                else setDytoDirection('neutral');
            }

            // Update chart + price header
            if (data.candles) {
                lastFetchRef.current = data.candles;
                if (selectedAsset) {
                    const assetData = data.assets.find((a: any) => a.symbol === selectedAsset.symbol);
                    if (assetData) {
                        const np = Number(assetData.current_price);
                        setCurrentPrice(np);
                        setPriceDiff(+(np - Number(assetData.previous_price)).toFixed(2));
                        if (!isFirstRun.current) {
                            if (Math.random() > 0.6) generateOrderBook(np);
                            if (Math.random() > 0.7) generateTrade(np);
                        }
                    }
                }
            }
            return data;
        } catch (e) {
            console.error('Fetch error:', e);
        }
    };

    // ── LIFECYCLE ────────────────────────────────────────────────────────────

    useEffect(() => {
        setIsClient(true);
        const init = async () => {
            const data = await fetchMarketData();
            if (data?.assets?.length) {
                const first = data.assets[0];
                setSelectedAsset(first);
                isFirstRun.current = false;
                setLoaded(true);
                if (data.candles?.[first.symbol]) {
                    setTimeout(() => chartRef.current?.setData(data.candles[first.symbol]), 200);
                }
            }
        };
        init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isFirstRun.current) return;
        fetchOrders();
        const interval = setInterval(fetchMarketData, TICK_INTERVAL);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAsset, session]);

    // ── SIMULATION TRIGGER ─────────────────────────────────────────────────────
    // Fires every 2s independently of the ticker poll
    useEffect(() => {
        if (isFirstRun.current) return;
        fetch('/api/market/simulate').catch(() => {});
        const simInterval = setInterval(() => {
            fetch('/api/market/simulate').catch(() => {});
        }, 1000);
        return () => clearInterval(simInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded]);


    useEffect(() => {
        if (!selectedAsset || isFirstRun.current) return;
        
        // Reset local price indicators to prevent stale display
        const latest = assets.find(a => a.symbol === selectedAsset.symbol);
        if (latest) {
            const p = Number(latest.current_price);
            setCurrentPrice(p);
            setPriceDiff(+(p - Number(latest.previous_price)).toFixed(2));
            generateOrderBook(p); 
        } else {
            // If asset not in list yet, clear order book to avoid confusion
            setOrderBook({ bids: [], asks: [] });
        }

        if (chartRef.current && lastFetchRef.current[selectedAsset.symbol]) {
            chartRef.current.setData(lastFetchRef.current[selectedAsset.symbol]);
        }
        setTradeMsg(null);
        setLimitMsg(null);
        setRecentTrades([]);
        setRightTab('trade');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAsset]);

    // Sync chart on every asset list update (1.5s tick)
    useEffect(() => {
        if (!selectedAsset || !chartRef.current || !lastFetchRef.current[selectedAsset.symbol]) return;
        const myCandles = lastFetchRef.current[selectedAsset.symbol];
        if (myCandles?.length > 0) chartRef.current.setData(myCandles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assets]);

    if (!isClient) return null;

    // ── TRADE ACTIONS ────────────────────────────────────────────────────────

    const handleTradeAction = async () => {
        if (!session || trading || !selectedAsset) return;
        setTrading(true);
        setTradeMsg(null);
        
        // Optimistic Balance Update
        const cost = Number(tradeAmount) * displayPrice;
        if (tradeType === 'buy' && userStats.balance < cost) {
            setTradeMsg({ type: 'error', text: 'Saldo kurang' });
            setTrading(false);
            return;
        }

        const oldStats = { ...userStats };
        if (tradeType === 'buy') setUserStats(prev => ({ ...prev, balance: prev.balance - cost }));
        else setUserStats(prev => ({ ...prev, balance: prev.balance + cost }));

        try {
            const res = await fetch('/api/market/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol: selectedAsset.symbol, amount: Number(tradeAmount), type: tradeType }),
            });
            const data = await res.json();
            if (data.success) {
                setTradeMsg({ type: 'success', text: data.message });
                await fetchMarketData();
            } else {
                setTradeMsg({ type: 'error', text: data.error });
                setUserStats(oldStats); // Rollback
            }
        } catch {
            setTradeMsg({ type: 'error', text: 'Transaction failed' });
            setUserStats(oldStats); // Rollback
        } finally {
            setTrading(false);
            setTimeout(() => setTradeMsg(null), 3500);
        }
    };

    const handleLimitOrder = async () => {
        if (!session || submittingLimit || !selectedAsset) return;
        if (!limitMinPrice || !limitMaxPrice || !limitAmount || Number(limitMinPrice) <= 0 || Number(limitMaxPrice) < Number(limitMinPrice) || Number(limitAmount) <= 0) {
            setLimitMsg({ type: 'error', text: 'Cek min/max harga (max harus >= min) dan jumlah lembar' });
            return;
        }
        setSubmittingLimit(true);
        setLimitMsg(null);

        // Optimistic UI Update
        const tempId = Math.random() * -1; // Negative ID to mark as pending
        const newOrder = {
            id: tempId,
            symbol: selectedAsset.symbol,
            amount: Number(limitAmount),
            min_price: Number(limitMinPrice),
            max_price: Number(limitMaxPrice),
            type: tradeType,
            status: 'pending'
        };
        setOpenOrders(prev => [newOrder, ...prev]);

        try {
            const res = await fetch('/api/market/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: selectedAsset.symbol,
                    amount: Number(limitAmount),
                    min_price: Number(limitMinPrice),
                    max_price: Number(limitMaxPrice),
                    type: tradeType,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setLimitMsg({ type: 'success', text: data.message });
                setLimitMinPrice('');
                setLimitMaxPrice('');
                fetchOrders();
            } else {
                setLimitMsg({ type: 'error', text: data.error });
                setOpenOrders(prev => prev.filter(o => o.id !== tempId)); // Rollback
            }
        } catch {
            setLimitMsg({ type: 'error', text: 'Failed to place order' });
            setOpenOrders(prev => prev.filter(o => o.id !== tempId)); // Rollback
        } finally {
            setSubmittingLimit(false);
            setTimeout(() => setLimitMsg(null), 4000);
        }
    };

    const cancelOrder = async (id: number) => {
        const oldOrders = [...openOrders];
        setOpenOrders(prev => prev.filter(o => o.id !== id)); // Optimistic Delete
        
        try {
            const res = await fetch('/api/market/orders', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (!data.success) {
                setOpenOrders(oldOrders); // Rollback if server fails
            } else {
                fetchOrders();
            }
        } catch {
            setOpenOrders(oldOrders); // Rollback
        }
    };

    // ── DERIVED STATE ────────────────────────────────────────────────────────

    const ownedAmount = userStats.portfolio.find(p => p.symbol === selectedAsset?.symbol)?.amount_owned || 0;
    const selectedPosition = userStats.portfolio.find(p => p.symbol === selectedAsset?.symbol) ?? null;
    const isSelectedCrashed = crashedAssets.has(selectedAsset?.symbol ?? '');

    // Use derived state for price to ensure header always matches selected asset
    const activeAssetData = assets.find(a => a.symbol === selectedAsset?.symbol);
    const displayPrice = activeAssetData ? Number(activeAssetData.current_price) : currentPrice;
    const displayDiff = activeAssetData ? +(Number(activeAssetData.current_price) - Number(activeAssetData.previous_price)).toFixed(2) : priceDiff;
    const displayIsUp = displayDiff >= 0;
    const displayPct = activeAssetData && Number(activeAssetData.previous_price) > 0
        ? ((displayDiff / Number(activeAssetData.previous_price)) * 100).toFixed(2)
        : '0.00';

    // ── RENDER ───────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-white flex flex-col font-mono tracking-tight">



            <main className="flex-1 pt-24 pb-6 px-4 md:px-6 mx-auto w-full max-w-[1600px] flex gap-4 h-[calc(100vh-80px)] overflow-hidden">

                {/* ── LEFT: MARKET LIST ─────────────────────────────────────── */}
                <div className="w-[280px] hidden xl:flex flex-col gap-4">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex-1 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                            <span className="flex items-center gap-2 font-bold text-xs">
                                <BarChart2 className="w-4 h-4 text-indigo-500" /> Markets
                            </span>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="text-[10px] text-[var(--text-tertiary)]">Live</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {assets.map(asset => {
                                const aCur = Number(asset.current_price);
                                const aPrev = Number(asset.previous_price);
                                const aUp = aCur >= aPrev;
                                const aPct = aPrev > 0 ? ((aCur - aPrev) / aPrev * 100).toFixed(2) : '0.00';
                                const sCfg = SENTIMENT_CFG[sentimentMap[asset.symbol] ?? 'neutral'] ?? SENTIMENT_CFG.neutral;
                                const isCrash = crashedAssets.has(asset.symbol);
                                const isSelected = selectedAsset?.symbol === asset.symbol;

                                return (
                                    <button
                                        key={asset.symbol}
                                        onClick={() => setSelectedAsset(asset)}
                                        className={`w-full text-left p-3 rounded-xl transition-all border ${
                                            isSelected
                                                ? 'bg-indigo-500/10 border-indigo-500/30'
                                                : 'hover:bg-white/5 border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-black text-xs">{asset.symbol}/COIN</span>
                                            <div className="flex items-center gap-1">
                                                {isCrash && (
                                                    <span className="text-[8px] px-1 py-0.5 bg-red-500/20 text-red-400 rounded font-black animate-pulse">
                                                        CRASH
                                                    </span>
                                                )}
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${sCfg.bg} ${sCfg.color}`}>
                                                    {sCfg.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-[var(--text-tertiary)]">{asset.name}</span>
                                            <div className="text-right">
                                                <div className={`font-bold text-sm tabular-nums ${aUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {aCur.toLocaleString()}
                                                </div>
                                                <div className={`text-[9px] ${aUp ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {aUp ? '+' : ''}{aPct}%
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── MIDDLE: CHART AREA ────────────────────────────────────── */}
                <div className="flex-1 flex flex-col gap-3 min-w-0">

                    {/* Chart header bar */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl border shrink-0 bg-white/5 border-white/10">
                                    {selectedAsset?.symbol?.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-xl font-black">{selectedAsset?.symbol}/COIN</div>
                                    <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{selectedAsset?.name}</div>
                                </div>
                            </div>

                            <div className="h-8 w-px bg-white/10 hidden md:block" />

                            <div className="hidden sm:block">
                                <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider">Live Price</p>
                                <p className={`text-xl font-black tabular-nums ${displayIsUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {displayPrice.toLocaleString()}
                                </p>
                            </div>

                            <div className="hidden md:block">
                                <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold">Change</p>
                                <p className={`text-sm font-bold flex items-center gap-1 ${displayIsUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {displayIsUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {displayIsUp ? '+' : ''}{displayDiff.toLocaleString()} ({displayIsUp ? '+' : ''}{displayPct}%)
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {dytoDirection !== 'neutral' && selectedAsset?.symbol !== 'DYTO' && (
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black border animate-pulse ${
                                    dytoDirection === 'up' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                    <Zap className="w-3 h-3" />
                                    DYTO {dytoDirection === 'up' ? 'PUMPING' : 'DUMPING'} — MARKET LEADING
                                </div>
                            )}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-bold">
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                                MAINNET LIVE
                            </div>
                        </div>
                    </div>

                    {/* Crash Mode Banner */}
                    <AnimatePresence>
                        {isSelectedCrashed && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3 shrink-0"
                            >
                                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
                                <div>
                                    <p className="text-red-400 text-xs font-black uppercase tracking-wider">
                                        💥 CRASH MODE ACTIVE — {selectedAsset?.symbol}
                                    </p>
                                    <p className="text-red-500/60 text-[10px] mt-0.5">
                                        Market sedang dalam siklus crash. Recovery sedang berlangsung secara organik.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Chart header with reset button */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex-1 relative overflow-hidden flex flex-col">
                        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                            <button
                                onClick={handleResetChart}
                                disabled={resetting}
                                title="Reset chart data"
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                    resetting
                                        ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/10 text-[var(--text-tertiary)]'
                                        : 'bg-orange-500/10 border-orange-500/25 text-orange-400 hover:bg-orange-500/20'
                                }`}
                            >
                                <RefreshCw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
                                {resetting ? 'RESETTING...' : 'RESET CHART'}
                            </button>
                        </div>
                        {loaded && selectedAsset && (
                            <div className="flex-1">
                                <TradingChart ref={chartRef} data={[]} />
                            </div>
                        )}
                    </div>


                </div>

                {/* ── RIGHT: TRADING PANEL ──────────────────────────────────── */}
                <div className="w-[300px] hidden lg:flex flex-col gap-3">

                    {/* Trade Panel */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3">

                        {/* Tab Navigation */}
                        <div className="flex gap-1 p-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                            {(['trade', 'limit'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setRightTab(tab)}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                        rightTab === tab
                                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                            : 'text-[var(--text-tertiary)] hover:text-white'
                                    }`}
                                >
                                    {tab === 'trade' ? 'MARKET' : 'LIMIT'}
                                </button>
                            ))}
                        </div>

                        {/* BUY / SELL toggle — shared for trade + limit tabs */}
                        {rightTab !== 'orders' && (
                            <div className="flex gap-2 p-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                                <button
                                    onClick={() => setTradeType('buy')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                                        tradeType === 'buy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-[var(--text-tertiary)] hover:text-white'
                                    }`}
                                >BUY</button>
                                <button
                                    onClick={() => setTradeType('sell')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                                        tradeType === 'sell' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-[var(--text-tertiary)] hover:text-white'
                                    }`}
                                >SELL</button>
                            </div>
                        )}

                        {/* ── MARKET ORDER TAB ── */}
                        {rightTab === 'trade' && (
                            <div className="space-y-3">
                                {!session ? (
                                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center space-y-3">
                                        <Zap className="w-8 h-8 text-indigo-400 mx-auto" />
                                        <p className="text-xs font-bold text-indigo-200">Login Discord untuk Trading</p>
                                        <button
                                            onClick={() => window.location.href = '/api/auth/signin'}
                                            className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 transition rounded-lg text-xs font-bold"
                                        >SIGN IN</button>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold text-[var(--text-tertiary)] px-1 mb-1">
                                                <span>AMOUNT (Lembar)</span>
                                                <span>Owned: {ownedAmount.toLocaleString()}</span>
                                            </div>
                                            <input
                                                type="number" step="0.001" min="0.001"
                                                value={tradeAmount}
                                                onChange={e => setTradeAmount(e.target.value)}
                                                className="w-full bg-[var(--bg-primary)] border border-white/10 rounded-xl py-3 px-4 text-sm font-bold focus:border-indigo-500/50 outline-none transition"
                                            />
                                        </div>

                                        <div className="p-3 bg-white/5 rounded-xl border border-[var(--border)] space-y-2">
                                            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] font-bold">
                                                <span>EST. VALUE</span>
                                                <span className="text-white">{(Number(tradeAmount) * displayPrice).toLocaleString()} Koin</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] font-bold">
                                                <span>BALANCE</span>
                                                <span className="text-emerald-400 flex items-center gap-1">
                                                    <Wallet className="w-3 h-3" /> {userStats.balance.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            disabled={trading}
                                            onClick={handleTradeAction}
                                            className={`w-full py-3 rounded-xl font-black text-sm transition-all shadow-lg ${
                                                trading ? 'opacity-50 cursor-not-allowed' :
                                                tradeType === 'buy' ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-95' : 'bg-red-500 hover:bg-red-400 active:scale-95'
                                            }`}
                                        >
                                            {trading ? 'PROCESSING...' : `CONFIRM ${tradeType.toUpperCase()}`}
                                        </button>

                                        <AnimatePresence>
                                            {tradeMsg && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                    className={`p-2 rounded-lg text-[10px] font-bold text-center ${
                                                        tradeMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                    }`}
                                                >{tradeMsg.text}</motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── LIMIT ORDER TAB ── */}
                        {rightTab === 'limit' && (
                            <div className="space-y-3">
                                {!session ? (
                                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center">
                                        <Zap className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-indigo-200">Login untuk pasang limit order</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-[var(--text-tertiary)] px-1 mb-1">MIN PRICE</label>
                                                <input
                                                    type="number" step="any"
                                                    placeholder="Min"
                                                    value={limitMinPrice}
                                                    onChange={e => setLimitMinPrice(e.target.value)}
                                                    className="w-full bg-[var(--bg-primary)] border border-white/10 rounded-xl py-3 px-4 text-sm font-bold focus:border-indigo-500/50 outline-none transition placeholder:text-gray-700 placeholder:font-normal placeholder:text-xs"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-[var(--text-tertiary)] px-1 mb-1">MAX PRICE</label>
                                                <input
                                                    type="number" step="any"
                                                    placeholder="Max"
                                                    value={limitMaxPrice}
                                                    onChange={e => setLimitMaxPrice(e.target.value)}
                                                    className="w-full bg-[var(--bg-primary)] border border-white/10 rounded-xl py-3 px-4 text-sm font-bold focus:border-indigo-500/50 outline-none transition placeholder:text-gray-700 placeholder:font-normal placeholder:text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold text-[var(--text-tertiary)] px-1 mb-1">
                                                <span>AMOUNT (Lembar)</span>
                                                <span>Owned: {ownedAmount.toLocaleString()}</span>
                                            </div>

                                            <input
                                                type="number" step="0.001" min="0.001"
                                                value={limitAmount}
                                                onChange={e => setLimitAmount(e.target.value)}
                                                className="w-full bg-[var(--bg-primary)] border border-white/10 rounded-xl py-3 px-4 text-sm font-bold focus:border-indigo-500/50 outline-none transition"
                                            />
                                        </div>

                                        <div className="p-3 bg-white/5 rounded-xl border border-[var(--border)] space-y-2">
                                            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] font-bold">
                                                <span>EST. VALUE (MAX)</span>
                                                <span className="text-white">{(Number(limitAmount) * Number(limitMaxPrice || 0)).toLocaleString()} Koin</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] font-bold">
                                                <span>BALANCE</span>
                                                <span className="text-emerald-400 flex items-center gap-1">
                                                    <Wallet className="w-3 h-3" /> {userStats.balance.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            disabled={submittingLimit}
                                            onClick={handleLimitOrder}
                                            className={`w-full py-3 rounded-xl font-black text-sm transition-all shadow-lg ${
                                                submittingLimit ? 'opacity-50 cursor-not-allowed' :
                                                tradeType === 'buy' ? 'bg-indigo-500 hover:bg-indigo-400 active:scale-95' : 'bg-orange-500 hover:bg-orange-400 active:scale-95'
                                            }`}
                                        >
                                            {submittingLimit ? 'PLACING...' : `PLACE LIMIT ${tradeType.toUpperCase()}`}
                                        </button>
                                        <p className="text-[9px] text-[var(--text-tertiary)] text-center">
                                            Order akan otomatis terisi saat harga tercapai
                                        </p>

                                        <AnimatePresence>
                                            {limitMsg && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                    className={`p-2 rounded-lg text-[10px] font-bold text-center ${
                                                        limitMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                    }`}
                                                >{limitMsg.text}</motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}
                            </div>
                        )}

                    </div>
                    
                    {/* ── OPEN ORDERS (Always Visible) ── */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex flex-col overflow-hidden max-h-[200px]">
                        <div className="p-3 border-b border-[var(--border)] bg-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-black text-white flex items-center gap-2 uppercase tracking-wider">
                                <Clock className="w-3 h-3 text-indigo-400" /> Open Orders
                            </span>
                            <span className="text-[10px] text-[var(--text-tertiary)] font-bold">{openOrders.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-hide">
                            {openOrders.length === 0 ? (
                                <div className="text-center py-6 text-gray-700 text-[10px] font-bold uppercase tracking-wider bg-black/20 rounded-xl border border-dashed border-[var(--border)]">
                                    No Active Orders
                                </div>
                            ) : openOrders.map(order => (
                                <div key={order.id} className="p-2.5 bg-white/5 rounded-xl border border-[var(--border)] flex flex-col gap-1 transition-all hover:border-indigo-500/30 group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-black px-1 py-0.5 rounded shadow-sm ${
                                                order.type === 'buy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            }`}>{order.type.toUpperCase()}</span>
                                            <span className="font-black text-[10px]">{order.symbol}</span>
                                        </div>
                                        <button 
                                            onClick={() => cancelOrder(order.id)} 
                                            className="text-[var(--text-tertiary)] hover:text-red-400 transition p-1 bg-white/5 rounded-lg"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold tabular-nums">
                                        <span className="text-[var(--text-tertiary)]">Range <span className="text-white ml-1">{Number(order.min_price).toLocaleString()} - {Number(order.max_price).toLocaleString()}</span></span>
                                        <span className="text-[var(--text-tertiary)]">Qty <span className="text-white ml-1">{Number(order.amount)}</span></span>
                                    </div>
                                    <div className="text-[9px] text-gray-700 font-bold">
                                        Current: {Number(assets?.find((a:any)=>a.symbol===order.symbol)?.current_price).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── P&L POSITION WIDGET ───────────────────────────────── */}
                    <AnimatePresence>
                        {session && selectedPosition && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 space-y-3"
                            >
                                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                                    Position — {selectedAsset?.symbol}
                                </p>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-[10px] text-[var(--text-tertiary)] mb-0.5">Avg Buy Price</p>
                                        <p className="text-xs font-bold text-white tabular-nums">
                                            {selectedPosition.avg_buy_price.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-[var(--text-tertiary)] mb-0.5">Holdings</p>
                                        <p className="text-xs font-bold text-white tabular-nums">
                                            {selectedPosition.amount_owned.toLocaleString()} lbr
                                        </p>
                                    </div>
                                </div>

                                <div className={`p-3 rounded-xl border ${
                                    selectedPosition.unrealized_pnl >= 0
                                        ? 'bg-emerald-500/10 border-emerald-500/20'
                                        : 'bg-red-500/10 border-red-500/20'
                                }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] font-bold text-[var(--text-tertiary)]">UNREALIZED P&L</p>
                                        <div className={`flex items-center gap-1 text-sm font-black ${
                                            selectedPosition.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                            {selectedPosition.unrealized_pnl >= 0
                                                ? <ArrowUpRight className="w-3 h-3" />
                                                : <ArrowDownRight className="w-3 h-3" />}
                                            {selectedPosition.unrealized_pnl_pct.toFixed(2)}%
                                        </div>
                                    </div>
                                    <p className={`text-base font-black tabular-nums ${
                                        selectedPosition.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                        {selectedPosition.unrealized_pnl >= 0 ? '+' : ''}
                                        {Math.round(selectedPosition.unrealized_pnl).toLocaleString()}
                                    </p>
                                    <p className="text-[9px] text-[var(--text-tertiary)] mt-1">
                                        Invested: {Math.round(selectedPosition.total_invested).toLocaleString()} Koin
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── ORDER BOOK ────────────────────────────────────────── */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex-1 flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-tertiary)] uppercase flex justify-between">
                            <span>Order Book</span>
                            <span>{selectedAsset?.symbol}/COIN</span>
                        </div>
                        <div className="p-3 border-b border-[var(--border)] flex justify-between text-[9px] text-[var(--text-tertiary)]">
                            <span>PRICE</span><span>SIZE</span>
                        </div>
                        <div className="flex-1 p-2 flex flex-col justify-between text-[10px] overflow-hidden">
                            <div className="flex flex-col-reverse gap-0.5 justify-end flex-1">
                                {orderBook.asks.map((ask, i) => (
                                    <div key={`ask-${i}`} className="flex justify-between items-center h-4 relative px-1">
                                        <div className="absolute inset-y-0 right-0 bg-red-500/5" style={{ width: `${(ask.size / 200) * 100}%` }} />
                                        <span className="text-red-400 z-10 tabular-nums">{ask.price.toLocaleString()}</span>
                                        <span className="text-[var(--text-tertiary)] z-10">{ask.size}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="py-2 border-y border-[var(--border)] text-center my-1">
                                <span className={`font-black tabular-nums ${displayIsUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {displayPrice.toLocaleString()}
                                </span>
                                <span className="text-[8px] text-[var(--text-tertiary)] block">LAST TRADED</span>
                            </div>
                            <div className="flex flex-col gap-0.5 flex-1">
                                {orderBook.bids.map((bid, i) => (
                                    <div key={`bid-${i}`} className="flex justify-between items-center h-4 relative px-1">
                                        <div className="absolute inset-y-0 right-0 bg-emerald-500/5" style={{ width: `${(bid.size / 200) * 100}%` }} />
                                        <span className="text-emerald-400 z-10 tabular-nums">{bid.price.toLocaleString()}</span>
                                        <span className="text-[var(--text-tertiary)] z-10">{bid.size}</span>
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
