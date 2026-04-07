"use client";

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineStyle, CrosshairMode } from 'lightweight-charts';

interface TradingChartProps {
    data: any[];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
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
    const tooltipRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);

    // Expose update methods to parent
    useImperativeHandle(ref, () => ({
        updateCandle: (candle: any) => {
            if (seriesRef.current) {
                seriesRef.current.update(candle);
            }
        },
        setData: (newData: any[]) => {
            if (seriesRef.current) {
                seriesRef.current.setData(newData);
            }
        }
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
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            width: container.clientWidth,
            height: container.clientHeight || 500,
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    width: 1,
                    color: 'rgba(255, 255, 255, 0.4)',
                    style: LineStyle.Dashed,
                    labelBackgroundColor: '#1e293b',
                    labelVisible: true,
                },
                horzLine: {
                    width: 1,
                    color: 'rgba(255, 255, 255, 0.4)',
                    style: LineStyle.Dashed,
                    labelBackgroundColor: '#1e293b',
                    labelVisible: true,
                },
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.05)',
                timeVisible: true,
                secondsVisible: false,
                barSpacing: 12,
            },
            handleScroll: true,
            handleScale: true,
        }) as any;

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981', 
            downColor: '#ef4444', 
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        candlestickSeries.setData(data);
        
        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

        // Custom Tooltip Logic (Clean Mode)
        chart.subscribeCrosshairMove((param: any) => {
            if (!tooltipRef.current) return;
            const tooltip = tooltipRef.current;

            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > container.clientWidth ||
                param.point.y < 0 ||
                param.point.y > container.clientHeight
            ) {
                tooltip.style.display = 'none';
                return;
            }

            const candle = param.seriesData.get(candlestickSeries) as any;
            if (!candle) {
                tooltip.style.display = 'none';
                return;
            }

            tooltip.style.display = 'block';
            
            const isUp = candle.close >= candle.open;
            const color = isUp ? '#10b981' : '#ef4444';

            tooltip.innerHTML = `
                <div style="font-family: inherit; font-size: 11px;">
                    <div style="color: #64748b; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 2px;">
                        ${new Date((param.time as number) * 1000).toLocaleString('en-US', { hour12: false, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <span style="color: #64748b; font-weight: bold; font-size: 10px;">O:</span> 
                            <span style="color: ${color}">${candle.open.toLocaleString()}</span>
                        </div>
                        <div>
                            <span style="color: #64748b; font-weight: bold; font-size: 10px;">H:</span> 
                            <span style="color: ${color}">${candle.high.toLocaleString()}</span>
                        </div>
                        <div>
                            <span style="color: #64748b; font-weight: bold; font-size: 10px;">L:</span> 
                            <span style="color: ${color}">${candle.low.toLocaleString()}</span>
                        </div>
                        <div>
                            <span style="color: #64748b; font-weight: bold; font-size: 10px;">C:</span> 
                            <span style="color: ${color}">${candle.close.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `;

            // Position tooltip
            const toolWidth = 160;
            const toolHeight = 70;
            let left = param.point.x + 15;
            let top = param.point.y + 15;

            if (left > container.clientWidth - toolWidth) left = param.point.x - toolWidth - 15;
            if (top > container.clientHeight - toolHeight) top = param.point.y - toolHeight - 15;

            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        });

        const handleResize = () => {
            chart.applyOptions({ width: container.clientWidth });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Effect to update data when props change without re-creating chart
    useEffect(() => {
        if (seriesRef.current && data && data.length > 0) {
            seriesRef.current.setData(data);
        }
    }, [data]);

    return (
        <div 
            ref={chartContainerRef} 
            className="w-full h-full relative overflow-hidden" 
            style={{ minHeight: '400px' }}
        >
            {/* Tooltip Melayang (Clean & Professional) */}
            <div 
                ref={tooltipRef}
                className="absolute z-50 pointer-events-none p-3 rounded-lg border border-white/10 bg-[#05050a]/90 backdrop-blur-xl shadow-2xl hidden"
                style={{ width: '160px' }}
            />
        </div>
    );
});

TradingChart.displayName = 'TradingChart';

export default TradingChart;
