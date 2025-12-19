import discord
from discord.ext import commands, tasks
import json
import logging
import aiohttp
import re
from xml.etree import ElementTree
from utils.database import get_db_connection
from datetime import datetime
import os

class Notification(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.youtube_api_key = os.getenv('YOUTUBE_API_KEY')
        self.dashboard_url = os.getenv('DASHBOARD_URL', 'https://dashboard-bot-virid.vercel.app')
        
        # Start background tasks
        self.webhook_event_check.start()  # Check webhook events (fast - 30 seconds)
        self.rss_feed_check.start()       # Fallback RSS check (slower - 5 minutes)
        
        # Cache to avoid duplicate notifications
        self.notified_videos = set()
        
        logging.info("[Notification] Cog initialized with webhook integration")

    def cog_unload(self):
        self.webhook_event_check.cancel()
        self.rss_feed_check.cancel()

    # ========================================
    # TASK 1: Check Webhook Events (Fast - 30s)
    # ========================================
    @tasks.loop(seconds=30)
    async def webhook_event_check(self):
        """Check for new events from PubSubHubbub webhook stored in database"""
        conn = get_db_connection()
        if not conn:
            return
        
        try:
            cursor = conn.cursor(dictionary=True)
            
            # Get unprocessed events from webhook
            cursor.execute("""
                SELECT * FROM youtube_live_events 
                WHERE is_processed = FALSE 
                ORDER BY created_at ASC 
                LIMIT 10
            """)
            events = cursor.fetchall()
            
            for event in events:
                try:
                    await self.process_webhook_event(event, cursor, conn)
                except Exception as e:
                    logging.error(f"[Notification] Error processing webhook event {event['video_id']}: {e}")
                    
        except Exception as e:
            logging.error(f"[Notification] Webhook event check error: {e}")
        finally:
            conn.close()

    async def process_webhook_event(self, event, cursor, conn):
        """Process a single webhook event"""
        video_id = event['video_id']
        channel_id = event['channel_id']
        
        # Skip if already notified
        if video_id in self.notified_videos:
            cursor.execute(
                "UPDATE youtube_live_events SET is_processed = TRUE, processed_at = NOW() WHERE video_id = %s",
                (video_id,)
            )
            conn.commit()
            return
        
        logging.info(f"[Notification] Processing webhook event: {video_id} from channel {channel_id}")
        
        # Check if this video is LIVE using YouTube Data API
        is_live, video_details = await self.check_if_live(video_id)
        
        # Get feeds that match this YouTube channel
        cursor.execute("""
            SELECT nf.*, nf.guild_id, nf.discord_channel_id, nf.custom_message_json, nf.type
            FROM notifications_feeds nf
            WHERE nf.is_enabled = 1 
            AND (nf.feed_url LIKE %s OR nf.feed_url LIKE %s)
        """, (f'%{channel_id}%', f'%/channel/{channel_id}%'))
        
        feeds = cursor.fetchall()
        
        if not feeds:
            logging.info(f"[Notification] No matching feeds for channel {channel_id}")
            # Still mark as processed
            cursor.execute(
                "UPDATE youtube_live_events SET is_processed = TRUE, processed_at = NOW() WHERE video_id = %s",
                (video_id,)
            )
            conn.commit()
            return
        
        # Prepare content info
        content_info = {
            'video_id': video_id,
            'title': video_details.get('title', event.get('video_title', 'New Content')),
            'channel_name': video_details.get('channelTitle', event.get('channel_name', 'YouTube Channel')),
            'thumbnail': f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
            'url': f"https://www.youtube.com/watch?v={video_id}",
            'is_live': is_live,
            'game': video_details.get('categoryId', ''),
        }
        
        # Send notifications to all matching feeds
        for feed in feeds:
            feed_type = feed.get('type', 'youtube')
            
            # For 'live' type feeds, only send if video is actually live
            if feed_type == 'live' and not is_live:
                logging.info(f"[Notification] Skipping live-only feed for non-live video {video_id}")
                continue
            
            await self.send_notification(feed, content_info)
        
        # Mark as processed and add to cache
        self.notified_videos.add(video_id)
        cursor.execute(
            "UPDATE youtube_live_events SET is_processed = TRUE, processed_at = NOW(), event_type = %s WHERE video_id = %s",
            ('live' if is_live else 'video', video_id)
        )
        conn.commit()
        
        logging.info(f"[Notification] Processed {'LIVE' if is_live else 'VIDEO'}: {video_id}")

    async def check_if_live(self, video_id: str) -> tuple:
        """Check if a video is currently live using YouTube Data API"""
        if not self.youtube_api_key:
            logging.warning("[Notification] No YOUTUBE_API_KEY configured, skipping live check")
            return False, {}
        
        url = f"https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id={video_id}&key={self.youtube_api_key}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as resp:
                    if resp.status != 200:
                        logging.error(f"[Notification] YouTube API error: {resp.status}")
                        return False, {}
                    
                    data = await resp.json()
                    items = data.get('items', [])
                    
                    if not items:
                        return False, {}
                    
                    video = items[0]
                    snippet = video.get('snippet', {})
                    live_details = video.get('liveStreamingDetails', {})
                    
                    # Check if live
                    live_broadcast = snippet.get('liveBroadcastContent', 'none')
                    is_live = live_broadcast == 'live'
                    
                    return is_live, {
                        'title': snippet.get('title', ''),
                        'channelTitle': snippet.get('channelTitle', ''),
                        'categoryId': snippet.get('categoryId', ''),
                        'liveBroadcastContent': live_broadcast,
                        'actualStartTime': live_details.get('actualStartTime'),
                    }
                    
        except Exception as e:
            logging.error(f"[Notification] Error checking live status: {e}")
            return False, {}

    # ========================================
    # TASK 2: RSS Feed Check (Fallback - 5min)
    # ========================================
    @tasks.loop(minutes=5)
    async def rss_feed_check(self):
        """Fallback: Check RSS feeds directly for new videos"""
        conn = get_db_connection()
        if not conn:
            return
        
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM notifications_feeds WHERE is_enabled = 1")
            feeds = cursor.fetchall()
            
            for feed in feeds:
                try:
                    await self.check_rss_feed(feed, cursor, conn)
                except Exception as e:
                    logging.error(f"[Notification] RSS check error for feed {feed['id']}: {e}")
                    
        except Exception as e:
            logging.error(f"[Notification] RSS feed check error: {e}")
        finally:
            conn.close()

    async def check_rss_feed(self, feed, cursor, conn):
        """Check a single RSS feed for new videos"""
        feed_url = feed['feed_url']
        
        # Convert YouTube channel URL to RSS feed URL
        rss_url = await self.get_youtube_rss_url(feed_url)
        if not rss_url:
            return
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(rss_url) as resp:
                    if resp.status != 200:
                        return
                    
                    xml_content = await resp.text()
                    root = ElementTree.fromstring(xml_content)
                    
                    # Parse Atom feed
                    ns = {'atom': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015'}
                    entries = root.findall('atom:entry', ns)
                    
                    if not entries:
                        return
                    
                    # Get latest entry
                    entry = entries[0]
                    video_id = entry.find('yt:videoId', ns)
                    if video_id is None:
                        return
                    
                    video_id = video_id.text
                    
                    # Skip if already notified
                    if video_id in self.notified_videos:
                        return
                    
                    # Check if already in database
                    cursor.execute("SELECT id FROM youtube_live_events WHERE video_id = %s", (video_id,))
                    if cursor.fetchone():
                        return  # Already tracked via webhook
                    
                    # Get video details
                    title_elem = entry.find('atom:title', ns)
                    author_elem = entry.find('atom:author/atom:name', ns)
                    
                    title = title_elem.text if title_elem is not None else 'New Video'
                    channel_name = author_elem.text if author_elem is not None else 'YouTube Channel'
                    
                    # Check if live
                    is_live, video_details = await self.check_if_live(video_id)
                    
                    # For live-type feeds, only notify if actually live
                    if feed.get('type') == 'live' and not is_live:
                        return
                    
                    content_info = {
                        'video_id': video_id,
                        'title': video_details.get('title', title),
                        'channel_name': video_details.get('channelTitle', channel_name),
                        'thumbnail': f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
                        'url': f"https://www.youtube.com/watch?v={video_id}",
                        'is_live': is_live,
                        'game': '',
                    }
                    
                    await self.send_notification(feed, content_info)
                    self.notified_videos.add(video_id)
                    
                    logging.info(f"[Notification] RSS found new {'LIVE' if is_live else 'video'}: {video_id}")
                    
        except Exception as e:
            logging.error(f"[Notification] RSS parsing error: {e}")

    async def get_youtube_rss_url(self, url: str) -> str:
        """Convert YouTube URL to RSS feed URL"""
        # Channel ID pattern (e.g., youtube.com/channel/UCxxxx)
        channel_match = re.search(r'channel/([a-zA-Z0-9_-]+)', url)
        if channel_match:
            return f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_match.group(1)}"
        
        # If already an RSS URL
        if 'feeds/videos.xml' in url:
            return url
        
        # Handle @username - resolve to channel ID using YouTube API
        if '/@' in url:
            username_match = re.search(r'/@([a-zA-Z0-9_-]+)', url)
            if username_match:
                username = username_match.group(1)
                channel_id = await self.resolve_username_to_channel_id(username)
                if channel_id:
                    return f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
                else:
                    logging.warning(f"[Notification] Could not resolve @{username} to channel ID")
                    return None
        
        # Handle /c/ custom URL format
        custom_match = re.search(r'/c/([a-zA-Z0-9_-]+)', url)
        if custom_match:
            custom_name = custom_match.group(1)
            channel_id = await self.resolve_custom_url_to_channel_id(custom_name)
            if channel_id:
                return f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
        
        return None

    async def resolve_username_to_channel_id(self, username: str) -> str:
        """Resolve YouTube @username to channel ID using YouTube Data API"""
        if not self.youtube_api_key:
            logging.warning("[Notification] No YOUTUBE_API_KEY, cannot resolve username")
            return None
        
        # Try using the handle/forHandle parameter (YouTube API v3)
        url = f"https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=@{username}&key={self.youtube_api_key}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as resp:
                    if resp.status != 200:
                        logging.error(f"[Notification] YouTube API error resolving @{username}: {resp.status}")
                        return None
                    
                    data = await resp.json()
                    items = data.get('items', [])
                    
                    if items:
                        channel_id = items[0].get('id')
                        logging.info(f"[Notification] Resolved @{username} -> {channel_id}")
                        return channel_id
                    
                    logging.warning(f"[Notification] No channel found for @{username}")
                    return None
                    
        except Exception as e:
            logging.error(f"[Notification] Error resolving username @{username}: {e}")
            return None

    async def resolve_custom_url_to_channel_id(self, custom_name: str) -> str:
        """Resolve YouTube custom URL (/c/name) to channel ID"""
        if not self.youtube_api_key:
            return None
        
        # Search for the channel by custom URL
        url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={custom_name}&type=channel&key={self.youtube_api_key}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as resp:
                    if resp.status != 200:
                        return None
                    
                    data = await resp.json()
                    items = data.get('items', [])
                    
                    if items:
                        return items[0].get('snippet', {}).get('channelId')
                    return None
                    
        except Exception as e:
            logging.error(f"[Notification] Error resolving custom URL {custom_name}: {e}")
            return None

    # ========================================
    # Notification Sending
    # ========================================
    async def send_notification(self, feed, content_info):
        """Sends the notification to Discord using custom or default message settings"""
        channel = self.bot.get_channel(int(feed['discord_channel_id']))
        if not channel:
            logging.warning(f"[Notification] Channel {feed['discord_channel_id']} not found")
            return
        
        custom_msg = feed.get('custom_message_json')
        
        if custom_msg:
            try:
                if isinstance(custom_msg, str):
                    if custom_msg.strip() in ('null', '', '{}'):
                        custom_msg = None
                    else:
                        custom_msg = json.loads(custom_msg)
            except json.JSONDecodeError:
                custom_msg = None
        
        if custom_msg and (custom_msg.get('message_content') or custom_msg.get('embeds')):
            await self.send_custom_embed(channel, custom_msg, content_info)
        else:
            await self.send_default_embed(channel, feed, content_info)

    async def send_default_embed(self, channel, feed, content):
        """Sends a beautiful default embed if no custom one is set"""
        is_live = content.get('is_live', False)
        feed_type = feed.get('type', 'youtube')
        
        if is_live or feed_type == 'live':
            # LIVE STREAM EMBED
            embed = discord.Embed(
                title=f"� {content.get('channel_name', 'Streamer')} is LIVE!",
                description=f"**{content.get('channel_name')}** sedang **LIVE** sekarang!\n\n"
                           f"📺 **[{content.get('title', 'Live Stream')}]({content.get('url')})**\n\n"
                           f"Yuk gabung sekarang! 🎮✨",
                color=0xFF0000,
                timestamp=datetime.utcnow()
            )
            embed.set_image(url=content.get('thumbnail', ''))
            embed.set_author(name=content.get('channel_name', 'YouTube'), icon_url="https://www.youtube.com/s/desktop/a386e432/img/favicon_144x144.png")
            mention = "@everyone"
        else:
            # NEW VIDEO EMBED
            embed = discord.Embed(
                title=f"📹 Video Baru dari {content.get('channel_name', 'Channel')}!",
                description=f"**{content.get('channel_name')}** baru saja upload video baru!\n\n"
                           f"🎬 **[{content.get('title', 'New Video')}]({content.get('url')})**\n\n"
                           f"Jangan sampai ketinggalan! 🔥",
                color=0xFF0000,
                timestamp=datetime.utcnow()
            )
            embed.set_image(url=content.get('thumbnail', ''))
            embed.set_author(name=content.get('channel_name', 'YouTube'), icon_url="https://www.youtube.com/s/desktop/a386e432/img/favicon_144x144.png")
            mention = ""

        embed.set_footer(
            text="Don Pollo Notifications", 
            icon_url=self.bot.user.avatar.url if self.bot.user and self.bot.user.avatar else None
        )
        
        try:
            await channel.send(content=mention, embed=embed)
            logging.info(f"[Notification] Sent {'LIVE' if is_live else 'video'} notification to {channel.name}")
        except Exception as e:
            logging.error(f"[Notification] Failed to send notification: {e}")

    async def send_custom_embed(self, channel, data, content):
        """Send custom embed with variable replacement"""
        text_content = data.get('message_content', '') or ''
        
        def replace_vars(text):
            if not text:
                return text
            replacements = {
                '{content.title}': content.get('title', ''),
                '{content.url}': content.get('url', ''),
                '{channel.name}': content.get('channel_name', ''),
                '{content.game}': content.get('game', ''),
                '{content.thumbnail}': content.get('thumbnail', ''),
            }
            for k, v in replacements.items():
                text = text.replace(k, str(v))
            return text

        text_content = replace_vars(text_content)
        embeds = []
        
        for e_data in data.get('embeds', []):
            try:
                color_str = e_data.get('color', '#FF0000')
                if isinstance(color_str, str):
                    color = int(color_str.replace('#', ''), 16)
                else:
                    color = color_str or 0xFF0000
                
                embed = discord.Embed(
                    title=replace_vars(e_data.get('title')),
                    description=replace_vars(e_data.get('description')),
                    color=color,
                    url=replace_vars(e_data.get('url')) or content.get('url')
                )
                
                if e_data.get('image_url'):
                    img_url = replace_vars(e_data['image_url'])
                    if img_url:
                        embed.set_image(url=img_url)
                    
                if e_data.get('thumbnail_url'):
                    thumb_url = replace_vars(e_data['thumbnail_url'])
                    if thumb_url:
                        embed.set_thumbnail(url=thumb_url)

                if e_data.get('footer_text'):
                    embed.set_footer(
                        text=replace_vars(e_data['footer_text']), 
                        icon_url=replace_vars(e_data.get('footer_icon_url')) or None
                    )
                
                embeds.append(embed)
            except Exception as e:
                logging.error(f"[Notification] Error building embed: {e}")
            
        try:
            await channel.send(content=text_content or None, embeds=embeds if embeds else None)
        except Exception as e:
            logging.error(f"[Notification] Failed to send custom message: {e}")

    @webhook_event_check.before_loop
    async def before_webhook_check(self):
        await self.bot.wait_until_ready()

    @rss_feed_check.before_loop
    async def before_rss_check(self):
        await self.bot.wait_until_ready()

async def setup(bot):
    await bot.add_cog(Notification(bot))
