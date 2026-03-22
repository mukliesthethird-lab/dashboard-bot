"use client";

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ animation: 'slide-in-right 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            {children}
        </div>
    );
}
