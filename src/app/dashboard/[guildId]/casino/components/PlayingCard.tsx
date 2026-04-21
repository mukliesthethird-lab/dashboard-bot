"use client";

import { motion } from "framer-motion";

export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades";
export type CardValue = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface CardData {
    suit: CardSuit | "hidden";
    value: CardValue | "?";
    isHidden?: boolean;
}

interface PlayingCardProps {
    card: CardData;
    index?: number;
    layoutId?: string;
    small?: boolean; // For compact views
}

// SVG suit symbols for crisp rendering at all sizes
function SuitSymbol({ suit, className }: { suit: CardSuit; className?: string }) {
    const isRed = suit === "hearts" || suit === "diamonds";
    const color = isRed ? "#E53E3E" : "#1A202C";

    if (suit === "hearts") return (
        <svg viewBox="0 0 24 24" fill={color} className={className}>
            <path d="M12 21.593c-.425-.396-8.5-7.7-8.5-13.093a6.5 6.5 0 0 1 13 0c0 5.393-8.075 12.697-8.5 13.093z" stroke={color} strokeWidth="1"/>
            <path d="M12 21.593c.425-.396 8.5-7.7 8.5-13.093a6.5 6.5 0 0 0-13 0c0 5.393 8.075 12.697 8.5 13.093z" stroke={color} strokeWidth="1"/>
        </svg>
    );
    if (suit === "diamonds") return (
        <svg viewBox="0 0 24 24" fill={color} className={className}>
            <polygon points="12,2 22,12 12,22 2,12"/>
        </svg>
    );
    if (suit === "clubs") return (
        <svg viewBox="0 0 24 24" fill={color} className={className}>
            <circle cx="12" cy="8" r="4"/>
            <circle cx="7" cy="13" r="4"/>
            <circle cx="17" cy="13" r="4"/>
            <rect x="10" y="14" width="4" height="5" rx="1"/>
            <rect x="8" y="18" width="8" height="2" rx="1"/>
        </svg>
    );
    // spades
    return (
        <svg viewBox="0 0 24 24" fill={color} className={className}>
            <path d="M12 2 C12 2, 3 10, 3 15 a4 4 0 0 0 7 1.5 C9 19 8 20 7 21 h10 c-1-1-2-2-3-3.5 a4 4 0 0 0 7-1.5 C21 10 12 2 12 2z"/>
        </svg>
    );
}

// Royal card center decoration
function RoyalCenter({ value, isRed }: { value: string; isRed: boolean }) {
    const color = isRed ? "#C53030" : "#2D3748";
    const labels: Record<string, string> = { J: "J", Q: "Q", K: "K" };
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ color, opacity: 0.15, fontSize: "3.5rem", fontWeight: 900, fontFamily: "Georgia, serif", lineHeight: 1 }}>
                {labels[value]}
            </span>
        </div>
    );
}

export default function PlayingCard({ card, index = 0, layoutId, small = false }: PlayingCardProps) {
    const isHiddenCard = card.isHidden || card.value === "?";
    const isRed = card.suit === "hearts" || card.suit === "diamonds";
    const isRoyal = ["J", "Q", "K"].includes(card.value as string);
    const isAce = card.value === "A";

    return (
        <motion.div
            layoutId={layoutId}
            initial={{ opacity: 0, y: -30, scale: 0.75, rotateZ: (index % 2 === 0 ? -5 : 5) }}
            animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1, 
                rotateZ: 0,
            }}
            transition={{ 
                duration: 0.5, 
                ease: [0.23, 1, 0.32, 1],
                delay: index * 0.08
            }}
            className={`relative ${small ? 'w-10 h-[3.8rem]' : 'w-14 h-[5.25rem] sm:w-[4.5rem] sm:h-28'} rounded-xl flex-shrink-0`}
            style={{ 
                perspective: "800px",
                transformStyle: "preserve-3d",
                filter: isHiddenCard ? "none" : "drop-shadow(0 8px 16px rgba(0,0,0,0.5))"
            }}
        >
            {/* Hidden Card (Face Down) */}
            {isHiddenCard ? (
                <div className="absolute inset-0 rounded-xl overflow-hidden border-2 border-indigo-400/30 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                    style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
                >
                    {/* Card back pattern */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: `repeating-linear-gradient(45deg, rgba(99,102,241,0.08) 0px, rgba(99,102,241,0.08) 1px, transparent 1px, transparent 8px),
                                          repeating-linear-gradient(-45deg, rgba(99,102,241,0.08) 0px, rgba(99,102,241,0.08) 1px, transparent 1px, transparent 8px)`
                    }}/>
                    <div className="absolute inset-2 border border-indigo-500/20 rounded-lg"/>
                    <div className="absolute inset-3.5 border border-indigo-500/10 rounded-md"/>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-400/30 flex items-center justify-center bg-indigo-500/10">
                            <span className="text-indigo-400/60 text-lg font-black">♠</span>
                        </div>
                    </div>
                </div>
            ) : (
                /* Face Card */
                <div 
                    className="absolute inset-0 rounded-xl overflow-hidden"
                    style={{ 
                        background: "linear-gradient(145deg, #ffffff 0%, #f8f5f0 100%)",
                        border: `2px solid ${isRed ? 'rgba(229,62,62,0.2)' : 'rgba(26,32,44,0.15)'}`,
                    }}
                >
                    {/* Subtle inner glow/texture */}
                    <div className="absolute inset-0" style={{
                        background: isRed 
                            ? "radial-gradient(ellipse at top left, rgba(229,62,62,0.04) 0%, transparent 60%)"
                            : "radial-gradient(ellipse at top left, rgba(26,32,44,0.03) 0%, transparent 60%)"
                    }}/>

                    {/* Top-left pip */}
                    <div className="absolute top-1.5 left-1.5 flex flex-col items-center leading-none">
                        <span 
                            className="font-black leading-none"
                            style={{ 
                                color: isRed ? "#C53030" : "#1A202C", 
                                fontSize: small ? "0.65rem" : "clamp(0.75rem, 2vw, 1.1rem)",
                                fontFamily: "Georgia, serif"
                            }}
                        >
                            {card.value}
                        </span>
                        {card.suit !== "hidden" && (
                            <SuitSymbol suit={card.suit as CardSuit} className={small ? "w-2.5 h-2.5" : "w-3 h-3 sm:w-3.5 sm:h-3.5"} />
                        )}
                    </div>

                    {/* Center decoration */}
                    {isRoyal && <RoyalCenter value={card.value as string} isRed={isRed} />}
                    {!isRoyal && !isAce && card.suit !== "hidden" && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-12">
                            <SuitSymbol suit={card.suit as CardSuit} className={small ? "w-6 h-6" : "w-10 h-10 sm:w-14 sm:h-14"} />
                        </div>
                    )}
                    {isAce && card.suit !== "hidden" && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                            <SuitSymbol suit={card.suit as CardSuit} className={small ? "w-8 h-8" : "w-12 h-12 sm:w-16 sm:h-16"} />
                        </div>
                    )}

                    {/* Bottom-right pip (rotated) */}
                    <div className="absolute bottom-1.5 right-1.5 flex flex-col items-center leading-none rotate-180">
                        <span 
                            className="font-black leading-none"
                            style={{ 
                                color: isRed ? "#C53030" : "#1A202C", 
                                fontSize: small ? "0.65rem" : "clamp(0.75rem, 2vw, 1.1rem)",
                                fontFamily: "Georgia, serif"
                            }}
                        >
                            {card.value}
                        </span>
                        {card.suit !== "hidden" && (
                            <SuitSymbol suit={card.suit as CardSuit} className={small ? "w-2.5 h-2.5" : "w-3 h-3 sm:w-3.5 sm:h-3.5"} />
                        )}
                    </div>

                    {/* Royal shine effect */}
                    {(isRoyal || isAce) && (
                        <div className="absolute inset-0 pointer-events-none" style={{
                            background: isRed 
                                ? "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 40%, rgba(229,62,62,0.05) 100%)"
                                : "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 40%, rgba(26,32,44,0.05) 100%)"
                        }}/>
                    )}
                </div>
            )}
        </motion.div>
    );
}
