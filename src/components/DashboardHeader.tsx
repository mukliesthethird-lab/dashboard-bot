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
    gradientFrom = "amber-400",
    gradientTo = "orange-500",
    icon
}: DashboardHeaderProps) {
    return (
        <div className="relative group mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className={`absolute -inset-4 bg-gradient-to-r from-${gradientFrom}/10 to-${gradientTo}/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000`} />
            <div className="relative">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-3">
                    {icon && <span className="mr-3">{icon}</span>}
                    <span className={`text-transparent bg-clip-text bg-gradient-to-r from-${gradientFrom} to-${gradientTo}`}>
                        {title}
                    </span>
                </h1>
                {subtitle && (
                    <p className="text-gray-400 text-lg font-medium max-w-2xl">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
