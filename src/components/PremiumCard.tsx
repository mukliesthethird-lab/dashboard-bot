"use client";

import React from "react";

interface PremiumCardProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    gradientFrom?: string;
    gradientTo?: string;
    className?: string;
    badge?: string;
}

export default function PremiumCard({
    children,
    title,
    description,
    icon,
    gradientFrom = "[#6366f1]",
    gradientTo = "[#a855f7]",
    className = "",
    badge
}: PremiumCardProps) {
    return (
        <div className={`relative h-full ${className}`}>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-xl h-full flex flex-col hover:border-[var(--border-hover)] transition-all duration-200">
                {(title || icon) && (
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {icon && (
                                <div className="p-2.5 bg-[var(--bg-hover)] rounded-lg">
                                    {icon}
                                </div>
                            )}
                            <div>
                                {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
                                {description && <p className="text-xs text-[var(--text-secondary)]">{description}</p>}
                            </div>
                        </div>
                        {badge && (
                            <span className="px-2 py-1 bg-[var(--accent-muted)] text-[var(--accent)] text-[10px] font-bold uppercase tracking-wider rounded-md">
                                {badge}
                            </span>
                        )}
                    </div>
                )}
                <div className="flex-1 flex flex-col">
                    {children}
                </div>
            </div>
        </div>
    );
}
