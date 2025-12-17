"use client";

// Reusable Skeleton Loader components for consistent loading states

interface SkeletonProps {
    className?: string;
}

// Base skeleton with shimmer animation
export function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <div className={`skeleton rounded-lg bg-stone-200 ${className}`} />
    );
}

// Skeleton for text/titles
export function SkeletonText({ lines = 1, className = "" }: SkeletonProps & { lines?: number }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
                />
            ))}
        </div>
    );
}

// Skeleton for cards  
export function SkeletonCard({ className = "" }: SkeletonProps) {
    return (
        <div className={`bg-white/90 rounded-2xl p-6 border-2 border-amber-100 shadow-sm ${className}`}>
            <div className="flex items-center gap-4 mb-4">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="flex-1">
                    <Skeleton className="h-4 w-2/3 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-4/5" />
        </div>
    );
}

// Skeleton for stats card
export function SkeletonStat({ className = "" }: SkeletonProps) {
    return (
        <div className={`bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl p-6 border-2 border-amber-200 shadow-md ${className}`}>
            <Skeleton className="w-10 h-10 rounded-lg mb-3" />
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-3 w-20" />
        </div>
    );
}

// Skeleton for table rows
export function SkeletonTableRow({ columns = 4, className = "" }: SkeletonProps & { columns?: number }) {
    return (
        <tr className={className}>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-6 py-4">
                    <Skeleton className="h-4 w-full" />
                </td>
            ))}
        </tr>
    );
}

// Skeleton for table
export function SkeletonTable({ rows = 5, columns = 4, className = "" }: SkeletonProps & { rows?: number; columns?: number }) {
    return (
        <div className={`bg-white/90 rounded-3xl border-2 border-amber-100 shadow-md overflow-hidden ${className}`}>
            <table className="w-full">
                <thead>
                    <tr className="bg-amber-50/50 border-b border-amber-100">
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} className="px-6 py-4">
                                <Skeleton className="h-3 w-20" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <SkeletonTableRow key={i} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Skeleton for list items (like leaderboard)
export function SkeletonListItem({ className = "" }: SkeletonProps) {
    return (
        <div className={`flex items-center gap-3 p-3 rounded-xl bg-stone-50 ${className}`}>
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0" />
        </div>
    );
}

// Skeleton for settings panel
export function SkeletonSettings({ className = "" }: SkeletonProps) {
    return (
        <div className={`bg-white/90 rounded-3xl p-6 border-2 border-amber-100 shadow-md space-y-4 ${className}`}>
            <div className="flex items-center gap-3 mb-6">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div>
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-3 w-64" />
                </div>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                </div>
            ))}
        </div>
    );
}

// Skeleton for action buttons grid
export function SkeletonActions({ count = 6, className = "" }: SkeletonProps & { count?: number }) {
    return (
        <div className={`bg-white/90 rounded-3xl p-6 border-2 border-amber-100 shadow-md ${className}`}>
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl bg-stone-50 border-2 border-stone-100">
                        <Skeleton className="w-8 h-8 rounded-lg mx-auto mb-2" />
                        <Skeleton className="h-3 w-16 mx-auto" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// Full page skeleton for dashboard
export function SkeletonDashboard() {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
            </div>

            {/* Actions */}
            <SkeletonActions count={3} />

            {/* Content */}
            <SkeletonSettings />
        </div>
    );
}
