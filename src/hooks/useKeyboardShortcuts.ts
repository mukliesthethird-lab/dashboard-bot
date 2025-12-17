"use client";

import { useEffect, useCallback } from "react";

interface ShortcutHandler {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    handler: () => void;
    description?: string;
}

interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
}

/**
 * Custom hook for keyboard shortcuts
 * 
 * Usage:
 * useKeyboardShortcuts([
 *   { key: 's', ctrl: true, handler: handleSave, description: 'Save' },
 *   { key: 'Escape', handler: handleClose, description: 'Close modal' }
 * ]);
 */
export function useKeyboardShortcuts(
    shortcuts: ShortcutHandler[],
    options: UseKeyboardShortcutsOptions = {}
) {
    const { enabled = true } = options;

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        // Don't trigger shortcuts when typing in inputs
        const target = event.target as HTMLElement;
        if (
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable
        ) {
            // Allow Escape even when in inputs
            if (event.key !== "Escape") return;
        }

        for (const shortcut of shortcuts) {
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
            const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
            const altMatch = shortcut.alt ? event.altKey : !event.altKey;

            if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                event.preventDefault();
                shortcut.handler();
                return;
            }
        }
    }, [shortcuts, enabled]);

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * Hook specifically for Escape key to close modals
 */
export function useEscapeKey(handler: () => void, enabled: boolean = true) {
    useKeyboardShortcuts(
        [{ key: "Escape", handler }],
        { enabled }
    );
}

/**
 * Hook specifically for Ctrl+S to save
 */
export function useSaveShortcut(handler: () => void, enabled: boolean = true) {
    useKeyboardShortcuts(
        [{ key: "s", ctrl: true, handler }],
        { enabled }
    );
}

/**
 * Hook for common modal shortcuts (Escape to close, Enter to confirm)
 */
export function useModalShortcuts(
    onClose: () => void,
    onConfirm?: () => void,
    enabled: boolean = true
) {
    const shortcuts: ShortcutHandler[] = [
        { key: "Escape", handler: onClose, description: "Close" }
    ];

    if (onConfirm) {
        shortcuts.push({
            key: "Enter",
            ctrl: true,
            handler: onConfirm,
            description: "Confirm"
        });
    }

    useKeyboardShortcuts(shortcuts, { enabled });
}

export default useKeyboardShortcuts;
