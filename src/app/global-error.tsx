"use client";

import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-red-50 to-orange-50">
                <div className="text-center max-w-lg">
                    {/* Error Icon */}
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-4">
                            <span className="text-5xl">💥</span>
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black text-stone-800 mb-4">
                        Critical Error
                    </h1>

                    <p className="text-stone-500 text-lg mb-8 leading-relaxed">
                        Something went very wrong. Please try refreshing the page.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => reset()}
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold transition shadow-lg"
                        >
                            🔄 Try Again
                        </button>
                        <a
                            href="/"
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-stone-700 font-bold border-2 border-stone-200 transition shadow-md"
                        >
                            🏠 Go Home
                        </a>
                    </div>
                </div>
            </body>
        </html>
    );
}
