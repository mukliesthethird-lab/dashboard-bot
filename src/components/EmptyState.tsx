"use client";

import React from "react";

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    actionText?: string;
    onAction?: () => void;
    variant?: "default" | "fishing" | "economy" | "moderation" | "roles" | "welcome" | "logging";
    className?: string;
}

// Variant-specific configurations
const VARIANTS = {
    default: {
        icon: "📂",
        bgGradient: "from-stone-100 to-stone-50",
        borderColor: "border-stone-200",
        iconBg: "bg-stone-200",
        buttonBg: "bg-stone-600 hover:bg-stone-700"
    },
    fishing: {
        icon: "🎣",
        bgGradient: "from-sky-50 to-blue-50",
        borderColor: "border-sky-200",
        iconBg: "bg-sky-100",
        buttonBg: "bg-sky-500 hover:bg-sky-600"
    },
    economy: {
        icon: "💰",
        bgGradient: "from-amber-50 to-yellow-50",
        borderColor: "border-amber-200",
        iconBg: "bg-amber-100",
        buttonBg: "bg-amber-500 hover:bg-amber-600"
    },
    moderation: {
        icon: "🛡️",
        bgGradient: "from-red-50 to-rose-50",
        borderColor: "border-rose-200",
        iconBg: "bg-rose-100",
        buttonBg: "bg-rose-500 hover:bg-rose-600"
    },
    roles: {
        icon: "🎭",
        bgGradient: "from-purple-50 to-violet-50",
        borderColor: "border-violet-200",
        iconBg: "bg-violet-100",
        buttonBg: "bg-violet-500 hover:bg-violet-600"
    },
    welcome: {
        icon: "👋",
        bgGradient: "from-green-50 to-emerald-50",
        borderColor: "border-emerald-200",
        iconBg: "bg-emerald-100",
        buttonBg: "bg-emerald-500 hover:bg-emerald-600"
    },
    logging: {
        icon: "📋",
        bgGradient: "from-blue-50 to-cyan-50",
        borderColor: "border-cyan-200",
        iconBg: "bg-cyan-100",
        buttonBg: "bg-cyan-500 hover:bg-cyan-600"
    }
};

export default function EmptyState({
    icon,
    title,
    description,
    actionText,
    onAction,
    variant = "default",
    className = ""
}: EmptyStateProps) {
    const config = VARIANTS[variant];
    const displayIcon = icon || config.icon;

    return (
        <div className={`bg-gradient-to-br ${config.bgGradient} rounded-3xl border-2 ${config.borderColor} p-8 md:p-12 text-center ${className}`}>
            {/* Animated Icon */}
            <div className="relative inline-block mb-6">
                <div className={`w-24 h-24 ${config.iconBg} rounded-full flex items-center justify-center mx-auto animate-bounce-subtle`}>
                    <span className="text-5xl">{displayIcon}</span>
                </div>
                {/* Decorative circles */}
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white/80 animate-pulse" />
                <div className="absolute -bottom-1 -left-3 w-4 h-4 rounded-full bg-white/60 animate-pulse delay-100" />
            </div>

            {/* Title */}
            <h3 className="text-2xl md:text-3xl font-black text-stone-800 mb-3">
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className="text-stone-500 text-lg mb-6 max-w-md mx-auto">
                    {description}
                </p>
            )}

            {/* Call to Action */}
            {actionText && onAction && (
                <button
                    onClick={onAction}
                    className={`px-6 py-3 ${config.buttonBg} text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl`}
                >
                    {actionText}
                </button>
            )}

            {/* Fun illustration elements based on variant */}
            {variant === "fishing" && (
                <div className="mt-8 flex justify-center gap-4 opacity-40">
                    <span className="text-3xl animate-bounce delay-100">🐟</span>
                    <span className="text-2xl animate-bounce delay-200">🐠</span>
                    <span className="text-4xl animate-bounce delay-300">🐡</span>
                    <span className="text-2xl animate-bounce delay-400">🦐</span>
                </div>
            )}
            {variant === "economy" && (
                <div className="mt-8 flex justify-center gap-4 opacity-40">
                    <span className="text-3xl animate-bounce delay-100">💵</span>
                    <span className="text-2xl animate-bounce delay-200">💎</span>
                    <span className="text-4xl animate-bounce delay-300">🏆</span>
                    <span className="text-2xl animate-bounce delay-400">⭐</span>
                </div>
            )}
            {variant === "moderation" && (
                <div className="mt-8 flex justify-center gap-4 opacity-40">
                    <span className="text-3xl animate-bounce delay-100">⚖️</span>
                    <span className="text-2xl animate-bounce delay-200">🔒</span>
                    <span className="text-4xl animate-bounce delay-300">✅</span>
                </div>
            )}
        </div>
    );
}

// Preset empty states for common scenarios
export function NoFishersEmptyState({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            variant="fishing"
            title="No Fishers Yet"
            description="No one has started fishing in this server. Get the community fishing!"
            actionText="View Fishing Guide"
            onAction={onAction}
        />
    );
}

export function NoEconomyUsersEmptyState({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            variant="economy"
            title="Economy is Empty"
            description="No users have earned any money yet. Start the economy rolling!"
            actionText="Give Money to User"
            onAction={onAction}
        />
    );
}

export function NoModerationCasesEmptyState() {
    return (
        <EmptyState
            variant="moderation"
            title="No Cases Found"
            description="There are no moderation cases matching your criteria. Your server is squeaky clean!"
        />
    );
}

export function NoRolesConfiguredEmptyState({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            variant="roles"
            title="No Reaction Roles"
            description="Create your first reaction role message to let users self-assign roles."
            actionText="Create Message"
            onAction={onAction}
        />
    );
}

export function NoActivityEmptyState() {
    return (
        <EmptyState
            variant="logging"
            title="No Recent Activity"
            description="There's no activity logged yet. Events will appear here once they happen."
        />
    );
}
