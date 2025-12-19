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
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    error: "bg-red-500/15 text-red-400 border-red-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const TOAST_ICON_STYLES: Record<ToastType, string> = {
    success: "bg-emerald-500/20 text-emerald-400",
    error: "bg-red-500/20 text-red-400",
    warning: "bg-amber-500/20 text-amber-400",
    info: "bg-blue-500/20 text-blue-400",
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
                flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm
                shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200
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
