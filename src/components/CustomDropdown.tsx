"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface DropdownOption {
    value: string;
    label: string;
    icon?: string;
}

interface CustomDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: DropdownOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    size?: 'md' | 'sm';
}

export default function CustomDropdown({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className = "",
    disabled = false,
    size = 'md',
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [mounted, setMounted] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number; width: number; openUpward: boolean } | null>(null);

    // Find selected option
    const selectedOption = options.find((opt) => opt.value === value);

    // Mount check for portal
    useEffect(() => {
        setMounted(true);
    }, []);

    // Calculate position with viewport boundary check
    const updatePosition = useCallback(() => {
        if (dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            const dropdownHeight = 240; // max-h-60 = 15rem = 240px
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            // Open upward if not enough space below but enough above
            const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

            setPosition({
                top: openUpward ? rect.top : rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                openUpward
            });
        }
    }, []);

    // Update position when opening
    useEffect(() => {
        if (isOpen) {
            updatePosition();
        }
    }, [isOpen, updatePosition]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (
                dropdownRef.current && !dropdownRef.current.contains(target) &&
                listRef.current && !listRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Close on scroll OUTSIDE the dropdown (not inside)
    useEffect(() => {
        if (!isOpen) return;

        function handleScroll(event: Event) {
            // Don't close if scrolling inside the dropdown list
            if (listRef.current && listRef.current.contains(event.target as Node)) {
                return;
            }
            setIsOpen(false);
        }
        window.addEventListener("scroll", handleScroll, true);
        return () => window.removeEventListener("scroll", handleScroll, true);
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        function handleKeyDown(e: KeyboardEvent) {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setHighlightedIndex((prev) =>
                        prev < options.length - 1 ? prev + 1 : 0
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setHighlightedIndex((prev) =>
                        prev > 0 ? prev - 1 : options.length - 1
                    );
                    break;
                case "Enter":
                    e.preventDefault();
                    if (highlightedIndex >= 0 && highlightedIndex < options.length) {
                        onChange(options[highlightedIndex].value);
                        setIsOpen(false);
                    }
                    break;
                case "Escape":
                    setIsOpen(false);
                    break;
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, highlightedIndex, options, onChange]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll("[data-option]");
            if (items[highlightedIndex]) {
                items[highlightedIndex].scrollIntoView({ block: "nearest" });
            }
        }
    }, [highlightedIndex, isOpen]);

    // Reset highlighted index when opening
    useEffect(() => {
        if (isOpen) {
            const currentIndex = options.findIndex((opt) => opt.value === value);
            setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
    }, [isOpen, options, value]);

    const handleSelect = (optValue: string) => {
        onChange(optValue);
        setIsOpen(false);
    };

    const handleToggle = () => {
        if (disabled) return;
        if (!isOpen) {
            // Calculate position before opening
            updatePosition();
        }
        setIsOpen(!isOpen);
    };

    // Only render dropdown when we have a valid position
    const dropdownList = mounted && isOpen && position && createPortal(
        <div
            ref={listRef}
            style={{
                position: 'fixed',
                top: position.openUpward ? 'auto' : position.top,
                bottom: position.openUpward ? (window.innerHeight - position.top + 4) : 'auto',
                left: position.left,
                width: position.width,
                zIndex: 99999,
                maxHeight: '240px'
            }}
            className="bg-[#16161f] border border-white/10 rounded-lg shadow-2xl overflow-y-auto custom-scrollbar"
        >
            {options.length === 0 ? (
                <div className="px-3 py-2 text-gray-500 text-sm">No options available</div>
            ) : (
                options.map((option, index) => (
                    <div
                        key={option.value || `opt-${index}`}
                        data-option
                        onClick={() => handleSelect(option.value)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`
                            px-3 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2
                            ${option.value === value
                                ? "bg-amber-500 text-black font-medium"
                                : highlightedIndex === index
                                    ? "bg-amber-500/80 text-black"
                                    : "text-white hover:bg-amber-500/80 hover:text-black"
                            }
                            ${index === 0 ? "rounded-t-lg" : ""}
                            ${index === options.length - 1 ? "rounded-b-lg" : ""}
                        `}
                    >
                        {option.icon && <span>{option.icon}</span>}
                        {option.label}
                    </div>
                ))
            )}
        </div>,
        document.body
    );

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleToggle}
                disabled={disabled}
                className={`
                    w-full ${size === 'sm' ? 'p-1 text-[11px]' : 'p-2 text-sm'} bg-white/5 border border-white/10 rounded-lg 
                    outline-none focus:border-amber-500/50 font-medium text-left
                    flex items-center justify-between gap-1 transition
                    ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-white/20 cursor-pointer"}
                    ${isOpen ? "border-amber-500/50" : ""}
                `}
            >
                <span className={selectedOption ? "text-white" : "text-gray-500"}>
                    {selectedOption ? (
                        <span className="flex items-center gap-2">
                            {selectedOption.icon && <span>{selectedOption.icon}</span>}
                            {selectedOption.label}
                        </span>
                    ) : (
                        placeholder
                    )}
                </span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown List via Portal */}
            {dropdownList}
        </div>
    );
}
