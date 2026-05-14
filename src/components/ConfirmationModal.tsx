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
    isOpen, onClose, onConfirm, title, message,
    confirmText = "Confirm", cancelText = "Cancel", isDestructive = false
}: ConfirmationModalProps) => {
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in border border-[var(--border)]">
                <div className="p-5 pb-2">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>
                <div className="px-5 py-2">
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{message}</p>
                </div>
                <div className="p-5 pt-4 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-white text-sm font-semibold rounded-lg transition-colors border border-[var(--border)]"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`flex-1 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all ${isDestructive
                            ? 'bg-[var(--error)] hover:brightness-110'
                            : 'bg-[var(--success)] hover:brightness-110'
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
