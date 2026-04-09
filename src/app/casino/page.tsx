"use client";

import InteractiveCasinoPage from "../dashboard/[guildId]/casino/page";

export default function GlobalCasinoPage() {
    // We reuse the same component as it handles global balance synced via API
    return <InteractiveCasinoPage />;
}
