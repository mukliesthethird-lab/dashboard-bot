"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineStyle, CrosshairMode } from 'lightweight-charts';

interface TradingChartProps {
    data: any[];
    colors?: {
        backgroundColor?: string;
        textColor?: string;
    };
}

export interface TradingChartHandle {
    updateCandle: (candle: any) => void;
    setData: (data: any[]) => void;
}

const TradingChart = forwardRef<TradingChartHandle, TradingChartProps>((props, ref) => {
    const {
        data,
        colors: {
            backgroundColor = '#0b0c10',
            textColor = '#94a3b8',
        } = {},
    } = props;

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const tooltipRef        = useRef<HTMLDivElement>(null);
    const chartRef          = useRef<any>(null);
    const seriesRef         = useRef<any>(null);

    useImperativeHandle(ref, () => ({
        updateCandle: (candle: any) => { seriesRef.current?.update(candle); },
        setData:      (newData: any[]) => { seriesRef.current?.setData(newData); },
    }));

    useEffect(() => {
        if (!chartContainerRef.current) return;
        const container = chartContainerRef.current;

        const chart = createChart(container, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
                fontFamily: 'JetBrains Mono, monospace',
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { color: 'rgba(255,255,255,0.03)' },
            },
            width:  container.clientWidth,
            height: container.clientHeight || 500,
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    width: 1,
                    color: 'rgba(255,255,255,0.35)',
                    style: LineStyle.Dashed,
                    labelBackgroundColor: '#1e293b',
                    labelVisible: true,
                },
                horzLine: {
                    width: 1,
                    color: 'rgba(255,255,255,0.35)',
                    style: LineStyle.Dashed,
                    labelBackgroundColor: '#1e293b',
                    labelVisible: true,
                },
            },
            timeScale: {
                borderColor: 'rgba(255,255,255,0.05)',
                timeVisible: true,
                secondsVisible: false,
                barSpacing: 12,
            },
            handleScroll: true,
            handleScale:  true,
        }) as any;

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor:      '#10b981',
            downColor:    '#f43f5e',
            borderVisible: false,
            wickUpColor:   '#10b981',
            wickDownColor: '#f43f5e',
        });

        candlestickSeries.setData(data);
        chartRef.current  = chart;
        seriesRef.current = candlestickSeries;

        // ── Premium Crosshair Tooltip ──────────────────────────────────────────
        chart.subscribeCrosshairMove((param: any) => {
            const tooltip = tooltipRef.current;
            if (!tooltip) return;

            const outOfBounds =
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 || param.point.x > container.clientWidth ||
                param.point.y < 0 || param.point.y > container.clientHeight;

            if (outOfBounds) {
                tooltip.style.opacity = '0';
                return;
            }

            const candle = param.seriesData.get(candlestickSeries) as any;
            if (!candle) { tooltip.style.opacity = '0'; return; }

            // ── Computed values ────────────────────────────────────────────────
            const isUp      = candle.close >= candle.open;
            const green     = '#10b981';
            const red       = '#f43f5e';
            const accent    = isUp ? green : red;
            const bgGlow    = isUp ? 'rgba(16,185,129,0.07)' : 'rgba(244,63,94,0.07)';
            const border    = isUp ? 'rgba(16,185,129,0.22)' : 'rgba(244,63,94,0.22)';
            const glowShadow = isUp ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)';
            const changeAbs = candle.close - candle.open;
            const changePct = candle.open > 0 ? (changeAbs / candle.open) * 100 : 0;
            const range     = candle.high - candle.low;
            const arrow     = isUp ? '▲' : '▼';

            const fmt = (v: number): string =>
                v.toLocaleString('en-US', { maximumFractionDigits: v >= 1_000_000 ? 0 : 2 });

            const dateStr = new Date((param.time as number) * 1000).toLocaleString('en-US', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false,
            });

            // ── Apply styles dynamically ───────────────────────────────────────
            tooltip.style.opacity     = '1';
            tooltip.style.background  = 'linear-gradient(145deg,#0c0d14 0%,' + bgGlow + ' 100%)';
            tooltip.style.borderColor = border;
            tooltip.style.boxShadow   = '0 8px 40px ' + glowShadow + ', 0 2px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)';

            // ── Build HTML ─────────────────────────────────────────────────────
            const sign = (v: number) => v >= 0 ? '+' : '';

            tooltip.innerHTML =
                '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;line-height:1.5;">' +

                // ── Header row: timestamp + change badge ─────────────────────
                '<div style="display:flex;align-items:center;justify-content:space-between;' +
                'margin-bottom:9px;padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,0.06);">' +
                '<span style="color:#475569;font-size:9px;letter-spacing:0.05em;">' + dateStr + '</span>' +
                '<span style="background:' + bgGlow + ';color:' + accent + ';border:1px solid ' + border + ';' +
                'padding:2px 9px;border-radius:99px;font-size:8.5px;font-weight:800;letter-spacing:0.07em;">' +
                arrow + ' ' + sign(changePct) + changePct.toFixed(2) + '%' +
                '</span></div>' +

                // ── OHLC grid ───────────────────────────────────────────────
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px 22px;margin-bottom:9px;">' +

                // Open
                '<div><div style="color:#334155;font-size:7px;font-weight:700;letter-spacing:0.15em;margin-bottom:2px;">OPEN</div>' +
                '<div style="color:#94a3b8;font-size:10px;font-weight:600;">' + fmt(candle.open) + '</div></div>' +

                // High
                '<div><div style="color:#334155;font-size:7px;font-weight:700;letter-spacing:0.15em;margin-bottom:2px;">HIGH</div>' +
                '<div style="color:' + green + ';font-size:10px;font-weight:600;">' + fmt(candle.high) + '</div></div>' +

                // Low
                '<div><div style="color:#334155;font-size:7px;font-weight:700;letter-spacing:0.15em;margin-bottom:2px;">LOW</div>' +
                '<div style="color:' + red + ';font-size:10px;font-weight:600;">' + fmt(candle.low) + '</div></div>' +

                // Close (accent, bold, slightly bigger)
                '<div><div style="color:#334155;font-size:7px;font-weight:700;letter-spacing:0.15em;margin-bottom:2px;">CLOSE</div>' +
                '<div style="color:' + accent + ';font-size:11.5px;font-weight:800;">' + fmt(candle.close) + '</div></div>' +

                '</div>' +

                // ── Footer: range + change ───────────────────────────────────
                '<div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:7px;">' +
                '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">' +
                '<span style="color:#1e293b;font-size:7px;font-weight:700;letter-spacing:0.12em;">RANGE</span>' +
                '<span style="color:#475569;font-size:9px;">' + fmt(range) + '</span>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;">' +
                '<span style="color:#1e293b;font-size:7px;font-weight:700;letter-spacing:0.12em;">CHANGE</span>' +
                '<span style="color:' + accent + ';font-size:9px;font-weight:700;">' + sign(changeAbs) + fmt(changeAbs) + '</span>' +
                '</div>' +
                '</div>' +

                '</div>';

            // ── Smart position (never goes outside chart) ──────────────────
            const TW = 232, TH = 190;
            let left = param.point.x + 20;
            let top  = param.point.y + 20;
            if (left + TW > container.clientWidth)  left = param.point.x - TW - 20;
            if (top  + TH > container.clientHeight) top  = param.point.y - TH - 20;
            if (left < 4) left = 4;
            if (top  < 4) top  = 4;
            tooltip.style.left = left + 'px';
            tooltip.style.top  = top  + 'px';
        });

        const handleResize = () => chart.applyOptions({ width: container.clientWidth });
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    useEffect(() => {
        if (seriesRef.current && data?.length > 0) seriesRef.current.setData(data);
    }, [data]);

    return (
        <div ref={chartContainerRef} className="w-full h-full relative overflow-hidden" style={{ minHeight: '400px' }}>
            {/* Premium Floating Tooltip */}
            <div
                ref={tooltipRef}
                className="absolute z-50 pointer-events-none rounded-xl border backdrop-blur-2xl"
                style={{
                    width: '232px',
                    padding: '12px 14px',
                    opacity: 0,
                    transition: 'opacity 0.12s ease',
                    background: '#0c0d14',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                }}
            />
        </div>
    );
});

TradingChart.displayName = 'TradingChart';
export default TradingChart;
