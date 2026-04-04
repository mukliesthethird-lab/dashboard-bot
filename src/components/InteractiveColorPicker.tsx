"use client";

import React, { useState, useEffect, useRef } from 'react';

interface InteractiveColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    onClose: () => void;
}

export default function InteractiveColorPicker({ color, onChange, onClose }: InteractiveColorPickerProps) {
    // Internal HSV for manipulation
    const [h, setH] = useState(0);
    const [s, setS] = useState(0);
    const [v, setV] = useState(1);
    const [tempColor, setTempColor] = useState(color);

    const satBoxRef = useRef<HTMLDivElement>(null);
    const hueSliderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const hsv = hexToHsv(color);
        setH(hsv.h);
        setS(hsv.s);
        setV(hsv.v);
        setTempColor(color);
    }, [color]);

    // Conversion Utilities
    function hexToHsv(hex: string) {
        let r = 0, g = 0, b = 0;
        const cleaned = hex.replace("#", "");
        if (cleaned.length === 3) {
            r = parseInt(cleaned[0] + cleaned[0], 16);
            g = parseInt(cleaned[1] + cleaned[1], 16);
            b = parseInt(cleaned[2] + cleaned[2], 16);
        } else {
            r = parseInt(cleaned.substring(0, 2), 16);
            g = parseInt(cleaned.substring(2, 4), 16);
            b = parseInt(cleaned.substring(4, 6), 16);
        }
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, v = max;
        const d = max - min;
        s = max === 0 ? 0 : d / max;
        if (max !== min) {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h, s, v };
    }

    function hsvToRgb(h: number, s: number, v: number) {
        let r = 0, g = 0, b = 0;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    function rgbToHex(r: number, g: number, b: number) {
        const toHex = (n: number) => {
            const hex = Math.max(0, Math.min(255, n)).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }

    const updateFromHSV = (newH: number, newS: number, newV: number) => {
        setH(newH); setS(newS); setV(newV);
        const rgb = hsvToRgb(newH, newS, newV);
        setTempColor(rgbToHex(rgb.r, rgb.g, rgb.b));
    };

    const handleSatMouseDown = (e: React.MouseEvent | MouseEvent) => {
        const move = (e: MouseEvent) => {
            if (!satBoxRef.current) return;
            const rect = satBoxRef.current.getBoundingClientRect();
            const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
            updateFromHSV(h, s, v);
        };
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        move(e as MouseEvent);
    };

    const handleHueMouseDown = (e: React.MouseEvent | MouseEvent) => {
        const move = (e: MouseEvent) => {
            if (!hueSliderRef.current) return;
            const rect = hueSliderRef.current.getBoundingClientRect();
            const h = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            updateFromHSV(h, s, v);
        };
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        move(e as MouseEvent);
    };

    const handleRgbChange = (channel: 'r'|'g'|'b', val: string) => {
        const n = parseInt(val) || 0;
        const currentRgb = hsvToRgb(h, s, v);
        const newRgb = { ...currentRgb, [channel]: Math.max(0, Math.min(255, n)) };
        const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        const hsv = hexToHsv(newHex);
        setH(hsv.h); setS(hsv.s); setV(hsv.v); setTempColor(newHex);
    };

    const rgb = hsvToRgb(h, s, v);
    const baseColor = rgbToHex(...Object.values(hsvToRgb(h, 1, 1)) as [number, number, number]);

    return (
        <div className="flex flex-col w-[230px] bg-white border border-gray-300 shadow-xl overflow-hidden animate-scale-in origin-top-left rounded-sm">
            {/* Top Saturation/Value Box - Exactly Chrome Style */}
            <div 
                ref={satBoxRef}
                onMouseDown={handleSatMouseDown}
                className="relative w-full h-[150px] cursor-crosshair"
                style={{ backgroundColor: baseColor }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                
                {/* Pointer handle circle */}
                <div 
                    className="absolute w-3 h-3 border-2 border-white rounded-full shadow-md -translate-x-1/2 translate-y-1/2 pointer-events-none"
                    style={{ left: `${s * 100}%`, bottom: `${v * 100}%` }}
                >
                    <div className="w-full h-full border border-black/10 rounded-full" />
                </div>
            </div>

            <div className="flex flex-col p-3 gap-4">
                {/* Mid Section: Eyedropper + Color Preview + Hue Slider */}
                <div className="flex items-center gap-3">
                    <div className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.42,2.33a3.52,3.52,0,0,0-5,0l-1.3,1.3,4,4,1.3-1.3A3.52,3.52,0,0,0,17.42,2.33Zm-7.6,5L4.42,12.72a3,3,0,0,0-.73,1.15L2.34,18.52a1,1,0,0,0,1.14,1.14l4.65-1.35a3,3,0,0,0,1.15-.73L14.67,12.3Z" />
                        </svg>
                    </div>

                    <div className="w-8 h-8 rounded-full border border-gray-200 shrink-0 shadow-sm" style={{ backgroundColor: tempColor }} />

                    <div className="flex-1 flex flex-col gap-1">
                        <div 
                            ref={hueSliderRef}
                            onMouseDown={handleHueMouseDown}
                            className="relative h-3 w-full cursor-pointer rounded-sm"
                            style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }}
                        >
                            <div 
                                className="absolute w-3.5 h-3.5 bg-white border border-gray-300 rounded-full shadow-sm -translate-x-1/2 top-1/2 -translate-y-1/2"
                                style={{ left: `${h * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Section: RGB Boxes */}
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2 justify-center">
                        {['R', 'G', 'B'].map((l, i) => (
                            <div key={l} className="flex flex-col items-center gap-1.5 min-w-[45px]">
                                <input 
                                    type="text"
                                    value={Object.values(rgb)[i]}
                                    onChange={(e) => handleRgbChange(l.toLowerCase() as 'r'|'g'|'b', e.target.value)}
                                    className="w-full h-8 bg-gray-50 border border-gray-200 text-center text-xs font-medium text-gray-700 outline-none focus:border-blue-500 rounded-sm"
                                />
                                <span className="text-[10px] text-gray-400 font-bold">{l}</span>
                            </div>
                        ))}
                    </div>

                    {/* HEX Section */}
                    <div className="flex items-center gap-2 px-1">
                        <input 
                            type="text"
                            value={tempColor.toUpperCase()}
                            onChange={(e) => {
                                const val = e.target.value;
                                setTempColor(val);
                                if (val.match(/^#[0-9a-fA-F]{6}$/)) {
                                    const hsv = hexToHsv(val);
                                    setH(hsv.h); setS(hsv.s); setV(hsv.v);
                                }
                            }}
                            className="flex-1 h-8 bg-gray-50 border border-gray-200 px-3 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500 rounded-sm uppercase text-center"
                        />
                        <div className="text-gray-300">
                           <svg className="w-4 h-4 cursor-pointer hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                        </div>
                    </div>
                </div>

                {/* Final Confirmation Button - Fixing "Once Click" problem */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button 
                        onClick={onClose}
                        className="flex-1 px-3 py-1.5 border border-gray-200 text-gray-500 text-[10px] font-bold uppercase hover:bg-gray-50 transition-colors rounded-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => { onChange(tempColor); onClose(); }}
                        className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold uppercase hover:bg-blue-700 transition-colors shadow-sm rounded-sm"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}
