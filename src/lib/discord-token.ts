import fs from 'fs';
import path from 'path';

/**
 * Get Discord bot token from environment (Vercel) or file (local dev)
 * Prioritizes process.env for production deployments
 */
export function getDiscordToken(): string {
    // First try process.env (works on Vercel and production)
    if (process.env.DISCORD_TOKEN) {
        return process.env.DISCORD_TOKEN;
    }

    // Fallback to file reading (for local development)
    const rootEnvPath = path.resolve(process.cwd(), '../.env');
    const localEnvPath = path.resolve(process.cwd(), '.env.local');

    for (const envPath of [rootEnvPath, localEnvPath]) {
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            const match = content.match(/DISCORD_TOKEN\s*=\s*(.+)/);
            if (match) {
                return match[1].trim().replace(/^["']|["']$/g, '');
            }
        }
    }

    return '';
}
