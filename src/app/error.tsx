"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Application error:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--bg-primary)]">
            <div className="text-center max-w-lg">
                <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--error-muted)] rounded-xl mb-4">
                        <span className="text-4xl">😵</span>
                    </div>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    Something Went Wrong
                </h1>
                <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                    Don Pollo ran into an unexpected error. Don't worry, our chickens are on the case!
                </p>

                <details className="mb-6 text-left bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)]">
                    <summary className="font-semibold text-sm text-white cursor-pointer hover:text-[var(--accent)]">
                        🔍 Error Details
                    </summary>
                    <div className="mt-3 space-y-2">
                        <pre className="p-3 bg-[var(--bg-primary)] rounded-lg text-xs text-[var(--error)] overflow-auto max-h-32 font-mono border border-[var(--border)]">
                            {error.message || "Unknown error"}
                        </pre>
                        {error.digest && (
                            <p className="text-xs text-[var(--text-tertiary)]">Digest: {error.digest}</p>
                        )}
                    </div>
                </details>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={() => reset()}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm transition flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Try Again
                    </button>
                    <Link href="/" className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[var(--bg-secondary)] text-white font-semibold text-sm border border-[var(--border)] hover:border-[var(--border-hover)] transition flex items-center justify-center gap-2">
                        🏠 Go Home
                    </Link>
                </div>

                <p className="mt-10 text-[var(--text-muted)] text-xs">
                    If this keeps happening, try refreshing or contact support.
                </p>
            </div>
        </div>
    );
}
