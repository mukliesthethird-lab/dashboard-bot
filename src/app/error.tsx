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
        // Log error to console (could also send to error reporting service)
        console.error("Application error:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-red-50 to-orange-50">
            <div className="text-center max-w-lg">
                {/* Error Icon */}
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-4 animate-pulse">
                        <span className="text-5xl">😵</span>
                    </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-stone-800 mb-4">
                    Oops! Something Went Wrong
                </h1>

                <p className="text-stone-500 text-lg mb-6 leading-relaxed">
                    Don Pollo ran into an unexpected error. Don't worry, our chickens are on the case!
                </p>

                {/* Error Details (collapsible) */}
                <details className="mb-8 text-left bg-white rounded-xl p-4 border border-red-200 shadow-sm">
                    <summary className="font-bold text-stone-700 cursor-pointer hover:text-stone-900">
                        🔍 Error Details
                    </summary>
                    <div className="mt-3 space-y-2">
                        <pre className="p-3 bg-red-50 rounded-lg text-xs text-red-700 overflow-auto max-h-32 font-mono">
                            {error.message || "Unknown error"}
                        </pre>
                        {error.digest && (
                            <p className="text-xs text-stone-400">
                                Digest: {error.digest}
                            </p>
                        )}
                    </div>
                </details>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={() => reset()}
                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold transition shadow-lg flex items-center justify-center gap-2 transform hover:scale-105"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Try Again</span>
                    </button>
                    <Link
                        href="/"
                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-stone-700 font-bold border-2 border-stone-200 hover:border-amber-400 transition shadow-md flex items-center justify-center gap-2"
                    >
                        <span>🏠</span>
                        <span>Go Home</span>
                    </Link>
                </div>

                {/* Help text */}
                <p className="mt-12 text-stone-400 text-sm">
                    If this keeps happening, try refreshing the page or contact our support.
                </p>
            </div>
        </div>
    );
}
