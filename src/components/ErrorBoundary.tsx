"use client";

import { useEffect, useState } from "react";

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorFallbackProps {
    error: Error;
    reset: () => void;
}

function ErrorFallback({ error, reset }: ErrorFallbackProps) {
    return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-red-50 to-orange-50">
            <div className="text-center max-w-lg">
                {/* Error Icon */}
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-4">
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
                <details className="mb-8 text-left bg-white rounded-xl p-4 border border-red-200">
                    <summary className="font-bold text-stone-700 cursor-pointer">
                        Error Details
                    </summary>
                    <pre className="mt-3 p-3 bg-red-50 rounded-lg text-xs text-red-700 overflow-auto max-h-32">
                        {error.message}
                    </pre>
                </details>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={reset}
                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold transition shadow-lg flex items-center justify-center gap-2"
                    >
                        <span>🔄</span>
                        <span>Try Again</span>
                    </button>
                    <a
                        href="/"
                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-stone-700 font-bold border-2 border-stone-200 hover:border-amber-400 transition shadow-md flex items-center justify-center gap-2"
                    >
                        <span>🏠</span>
                        <span>Go Home</span>
                    </a>
                </div>

                {/* Fun message */}
                <p className="mt-12 text-stone-400 text-sm">
                    If this keeps happening, try refreshing or contact support.
                </p>
            </div>
        </div>
    );
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
    const [hasError, setHasError] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            setHasError(true);
            setError(new Error(event.message));
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            setHasError(true);
            setError(new Error(String(event.reason)));
        };

        window.addEventListener("error", handleError);
        window.addEventListener("unhandledrejection", handleUnhandledRejection);

        return () => {
            window.removeEventListener("error", handleError);
            window.removeEventListener("unhandledrejection", handleUnhandledRejection);
        };
    }, []);

    const reset = () => {
        setHasError(false);
        setError(null);
    };

    if (hasError && error) {
        return <ErrorFallback error={error} reset={reset} />;
    }

    return <>{children}</>;
}
