"use client";

import React from "react";

interface DashboardHeaderProps {
    title: string;
    subtitle?: string;
    gradientFrom?: string;
    gradientTo?: string;
    icon?: string;
}

export default function DashboardHeader({
    title,
    subtitle,
    gradientFrom = "indigo-400",
    gradientTo = "purple-500",
    icon
}: DashboardHeaderProps) {
    return (
        <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight mb-1">
                {icon && <span className="mr-2">{icon}</span>}
                <span className={`text-transparent bg-clip-text bg-gradient-to-r from-${gradientFrom} to-${gradientTo}`}>
                    {title}
                </span>
            </h1>
            {subtitle && (
                <p className="text-[var(--text-secondary)] text-sm font-medium">
                    {subtitle}
                </p>
            )}
        </div>
    );
}
