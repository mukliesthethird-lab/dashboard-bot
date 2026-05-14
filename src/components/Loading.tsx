import React from 'react';

interface LoadingProps {
    message?: string;
}

const Loading = ({ message }: LoadingProps) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-6">
            <div className="relative h-[60px] w-[60px] box-content p-2.5">
                <div className="absolute h-5 w-5 bg-[#5865F2] animate-[discordLoad_2s_infinite]" />
                <div className="absolute h-5 w-5 bg-[#5865F2] animate-[discordLoad_2s_infinite_1s]" />
            </div>
            {message && (
                <p className="text-[var(--text-secondary)] font-bold uppercase tracking-[0.2em] text-sm animate-pulse">
                    {message}
                </p>
            )}
            <style jsx>{`
                @keyframes discordLoad {
                    0% {
                        transform: translate(0px, 0px) scale(1) rotate(0deg);
                    }
                    25% {
                        transform: translate(40px, 0px) scale(0.5) rotate(-90deg);
                    }
                    50% {
                        transform: translate(40px, 40px) scale(1) rotate(180deg);
                    }
                    75% {
                        transform: translate(0px, 40px) scale(0.5) rotate(90deg);
                    }
                    100% {
                        transform: translate(0px, 0px) scale(1) rotate(0deg);
                    }
                }
            `}</style>
        </div>
    );
};

export default Loading;
