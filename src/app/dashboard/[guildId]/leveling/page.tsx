import { use } from "react";
import LevelingSettings from "@/components/LevelingSettings";

export default function Page({ params }: { params: Promise<{ guildId: string }> }) {
    const { guildId } = use(params);
    return <LevelingSettings guildId={guildId} />;
}
