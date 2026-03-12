"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastProps {
    type: ToastType;
    message: string;
    duration?: number; // in ms, 0 means persistent
    onClose?: () => void;
}

interface ToastContainerProps {
    toast: ToastProps | null;
    onClose: () => void;
}

const TOAST_ICONS: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
};

const TOAST_STYLES: Record<ToastType, string> = {
    success: "bg-[#232428] text-[#248046] border-[#248046]/50 shadow-[0_4px_15px_-5px_rgba(36,128,70,0.3)]",
    error: "bg-[#232428] text-[#da373c] border-[#da373c]/50 shadow-[0_4px_15px_-5px_rgba(218,55,60,0.3)]",
    warning: "bg-[#232428] text-[#f0b232] border-[#f0b232]/50 shadow-[0_4px_15px_-5px_rgba(240,178,50,0.3)]",
    info: "bg-[#232428] text-[#5865f2] border-[#5865f2]/50 shadow-[0_4px_15px_-5px_rgba(88,101,242,0.3)]",
};

const TOAST_ICON_STYLES: Record<ToastType, string> = {
    success: "bg-[#248046]/20 text-[#248046]",
    error: "bg-[#da373c]/20 text-[#da373c]",
    warning: "bg-[#f0b232]/20 text-[#f0b232]",
    info: "bg-[#5865f2]/20 text-[#5865f2]",
};

// Single Toast Component
export function Toast({ type, message, duration = 5000, onClose }: ToastProps & { onClose: () => void }) {
    useEffect(() => {
        if (duration > 0 && onClose) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    return (
        <div
            className={`
                flex items-center gap-3 px-4 py-3 rounded-[4px] border border-l-4
                shadow-2xl animate-fade-in
                ${TOAST_STYLES[type]}
            `}
        >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${TOAST_ICON_STYLES[type]}`}>
                {TOAST_ICONS[type]}
            </span>
            <span className="font-medium text-sm">{message}</span>
            {onClose && (
                <button
                    onClick={onClose}
                    className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
                >
                    ✕
                </button>
            )}
        </div>
    );
}

// ToastContainer - fixed position bottom-right to avoid navbar
export function ToastContainer({ toast, onClose }: ToastContainerProps) {
    if (!toast) return null;

    // Render via portal to body
    if (typeof window === "undefined") return null;

    return createPortal(
        <div className="fixed bottom-10 right-6 z-[99999]">
            <Toast {...toast} onClose={onClose} />
        </div>,
        document.body
    );
}

// Inline Toast - for embedding within a component (not fixed position)
export function InlineToast({ type, message, onClose }: { type: ToastType; message: string; onClose?: () => void }) {
    return (
        <div
            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl border
                ${TOAST_STYLES[type]}
            `}
        >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${TOAST_ICON_STYLES[type]}`}>
                {TOAST_ICONS[type]}
            </span>
            <span className="font-medium text-sm flex-1">{message}</span>
            {onClose && (
                <button
                    onClick={onClose}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                >
                    ✕
                </button>
            )}
        </div>
    );
}

// Hook for easy toast management
export function useToast() {
    const [toast, setToast] = useState<ToastProps | null>(null);

    const showToast = (type: ToastType, message: string, duration = 3000) => {
        setToast({ type, message, duration });
    };

    const hideToast = () => {
        setToast(null);
    };

    const success = (message: string, duration = 3000) => showToast("success", message, duration);
    const error = (message: string, duration = 3000) => showToast("error", message, duration);
    const warning = (message: string, duration = 3000) => showToast("warning", message, duration);
    const info = (message: string, duration = 3000) => showToast("info", message, duration);

    return {
        toast,
        showToast,
        hideToast,
        success,
        error,
        warning,
        info,
    };
}

// Need to import useState for the hook
import { useState } from "react";

export default ToastContainer;
