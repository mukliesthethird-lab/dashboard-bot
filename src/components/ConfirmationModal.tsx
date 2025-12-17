"use client";

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false
}: ConfirmationModalProps) => {
    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[#16161f] rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-scale-in border border-white/10">
                {/* Header */}
                <div className="p-6 pb-2">
                    <h3 className="text-xl font-black text-white">{title}</h3>
                </div>

                {/* Content */}
                <div className="px-6 py-2">
                    <p className="text-gray-400 font-medium leading-relaxed">{message}</p>
                </div>

                {/* Footer */}
                <div className="p-6 pt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors active:scale-95 border border-white/10"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-4 py-2.5 font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2
                            ${isDestructive
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
