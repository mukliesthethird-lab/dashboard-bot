/**
 * Utility to log dashboard activity to the database via API.
 */
export async function logActivity(guildId: string, action: string, details?: string) {
    try {
        const response = await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guild_id: guildId,
                action,
                details
            }),
        });
        return response.ok;
    } catch (error) {
        console.error('Failed to log activity:', error);
        return false;
    }
}
