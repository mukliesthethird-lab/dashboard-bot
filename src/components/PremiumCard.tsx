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
    gradientFrom = "[#5865f2]",
    gradientTo = "[#4752c4]",
    className = "",
    badge
}: PremiumCardProps) {
    return (
        <div className={`group relative h-full ${className}`}>
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-${gradientFrom} to-${gradientTo} rounded-[8px] blur opacity-10 group-hover:opacity-30 transition duration-500`} />
            <div className="relative bg-[#2b2d31] border border-[#1e1f22] p-6 rounded-[8px] h-full flex flex-col shadow-sm">
                {(title || icon) && (
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            {icon && (
                                <div className={`p-3 bg-${gradientFrom}/10 rounded-xl text-${gradientFrom}`}>
                                    {icon}
                                </div>
                            )}
                            <div>
                                {title && <h3 className="text-xl font-bold text-[#f2f3f5]">{title}</h3>}
                                {description && <p className="text-sm text-[#b5bac1]">{description}</p>}
                            </div>
                        </div>
                        {badge && (
                            <span className={`px-2 py-1 bg-${gradientFrom}/10 text-${gradientFrom} text-[10px] font-black uppercase tracking-wider rounded-md`}>
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
