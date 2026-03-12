
import pool from './db';

const YOUTUBE_HUB_URL = 'https://pubsubhubbub.appspot.com/subscribe';
const CALLBACK_URL = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/youtube-webhook`
    : 'https://dashboard-bot-virid.vercel.app/api/youtube-webhook';

/**
 * Resolves a YouTube URL to a canonical Channel ID (UC...).
 */
export async function resolveYouTubeChannelId(url: string): Promise<string | null> {
    // 1. Direct ID check
    const idMatch = url.match(/(?:channel\/|UC)([a-zA-Z0-9_-]{24})/);
    if (idMatch) return idMatch[1];

    // 2. Fetch page and look for channel metadata if it's a handle (@)
    if (url.includes('@') || url.includes('/user/')) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
            const html = await response.text();
            
            // Look for <meta itemprop="identifier" content="UC...">
            const metaMatch = html.match(/itemprop="identifier" content="(UC[a-zA-Z0-9_-]{22})"/);
            if (metaMatch) return metaMatch[1];
            
            // Fallback: look for "channelId":"UC..."
            const ucMatch = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
            if (ucMatch) return ucMatch[1];
        } catch (error) {
            console.error('[YouTube Utils] Failed to resolve channel ID:', error);
        }
    }

    return null;
}

/**
 * Triggers a WebSub subscription request to Google's Hub.
 */
export async function subscribeToWebSub(channelId: string) {
    const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;
    
    const formData = new URLSearchParams();
    formData.append('hub.callback', CALLBACK_URL);
    formData.append('hub.topic', topicUrl);
    formData.append('hub.verify', 'async');
    formData.append('hub.mode', 'subscribe');
    formData.append('hub.lease_seconds', '432000'); // 5 days

    try {
        const response = await fetch(YOUTUBE_HUB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
        });

        if (response.status === 202 || response.status === 204) {
            // Update the youtube_subscriptions table
            await pool.query(`
                INSERT INTO youtube_subscriptions (channel_id, hub_topic, status)
                VALUES (?, ?, 'pending')
                ON DUPLICATE KEY UPDATE
                    hub_topic = VALUES(hub_topic),
                    status = 'pending',
                    updated_at = CURRENT_TIMESTAMP
            `, [channelId, topicUrl]);
            return true;
        }
    } catch (error) {
        console.error('[YouTube Utils] Hub subscription error:', error);
    }
    return false;
}

/**
 * Triggers a WebSub unsubscription request.
 */
export async function unsubscribeFromWebSub(channelId: string) {
    const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;
    
    const formData = new URLSearchParams();
    formData.append('hub.callback', CALLBACK_URL);
    formData.append('hub.topic', topicUrl);
    formData.append('hub.verify', 'async');
    formData.append('hub.mode', 'unsubscribe');

    try {
        const response = await fetch(YOUTUBE_HUB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
        });

        if (response.status === 202 || response.status === 204) {
            await pool.query(
                'UPDATE youtube_subscriptions SET status = "unsubscribed" WHERE channel_id = ?',
                [channelId]
            );
            return true;
        }
    } catch (error) {
        console.error('[YouTube Utils] Hub unsubscription error:', error);
    }
    return false;
}
