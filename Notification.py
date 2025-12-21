import discord
from discord.ext import commands, tasks
import json
import logging
import asyncio
import aiohttp
import re
import os
import xml.etree.ElementTree as ET
from utils.database import get_db_connection
from datetime import datetime, timedelta

# Configuration
WEBHOOK_CALLBACK_URL = "https://dashboard-bot-virid.vercel.app/api/youtube-webhook"
YOUTUBE_HUB_URL = "https://pubsubhubbub.appspot.com/subscribe"
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

class Notification(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.notification_check.start()
        self.subscription_check.start()
        if YOUTUBE_API_KEY:
            self.live_check.start()
        # Storage for last notified IDs to avoid spam
        # format: {feed_id: set of video_ids}
        self.notified_videos = {}
        # Track which channels are currently live to avoid duplicate notifications
        # format: {channel_id: video_id}
        self.live_channels = {}
        self.session = None

    async def get_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    def cog_unload(self):
        self.notification_check.cancel()
        self.subscription_check.cancel()
        if YOUTUBE_API_KEY:
            self.live_check.cancel()
        if self.session and not self.session.closed:
            asyncio.create_task(self.session.close())

    def extract_channel_id(self, url: str) -> str | None:
        """Extract YouTube channel ID from various URL formats"""
        # Format: youtube.com/channel/UCxxxxxx
        match = re.search(r'youtube\.com/channel/([a-zA-Z0-9_-]+)', url)
        if match:
            return match.group(1)
        
        # Format: youtube.com/@handle - need to resolve
        match = re.search(r'youtube\.com/@([a-zA-Z0-9_-]+)', url)
        if match:
            # For handles, we'll need to resolve later or store as-is
            return f"@{match.group(1)}"
        
        # Format: Direct channel ID
        if re.match(r'^UC[a-zA-Z0-9_-]{22}$', url):
            return url
            
        return None

    @tasks.loop(seconds=30)
    async def notification_check(self):
        """Background task to check for new content - runs every 30 seconds for near-realtime"""
        conn = get_db_connection()
        if not conn:
            return
        
        try:
            cursor = conn.cursor(dictionary=True)
            
            # PRIORITY 1: Check webhook events (realtime from PubSubHubbub)
            await self.process_webhook_events(cursor, conn)
            
            # PRIORITY 2: Get all enabled YouTube feeds for RSS fallback
            cursor.execute("SELECT * FROM notifications_feeds WHERE is_enabled = 1 AND type = 'youtube'")
            feeds = cursor.fetchall()
            
            for feed in feeds:
                try:
                    await self.process_feed(feed, cursor, conn)
                except Exception as e:
                    logging.error(f"Error processing feed {feed['id']}: {e}")
                    
        except Exception as e:
            logging.error(f"Notification check error: {e}")
        finally:
            conn.close()

    @tasks.loop(hours=12)
    async def subscription_check(self):
        """Periodically renew PubSubHubbub subscriptions"""
        conn = get_db_connection()
        if not conn:
            return
            
        try:
            cursor = conn.cursor(dictionary=True)
            
            # Get all enabled YouTube feeds
            cursor.execute("SELECT DISTINCT feed_url FROM notifications_feeds WHERE is_enabled = 1 AND type = 'youtube'")
            feeds = cursor.fetchall()
            
            for feed in feeds:
                channel_id = self.extract_channel_id(feed['feed_url'])
                if channel_id and not channel_id.startswith('@'):
                    await self.subscribe_to_pubsub(channel_id, cursor, conn)
                    await asyncio.sleep(1)  # Rate limit
                    
        except Exception as e:
            logging.error(f"Subscription check error: {e}")
        finally:
            conn.close()

    @tasks.loop(seconds=60)
    async def live_check(self):
        """Check if any tracked YouTube channels are currently live streaming"""
        if not YOUTUBE_API_KEY:
            return
            
        conn = get_db_connection()
        if not conn:
            return
            
        try:
            cursor = conn.cursor(dictionary=True)
            
            # Get all enabled YouTube feeds
            cursor.execute("SELECT * FROM notifications_feeds WHERE is_enabled = 1 AND type = 'youtube'")
            feeds = cursor.fetchall()
            
            # Group feeds by channel_id to avoid duplicate API calls
            channel_feeds = {}
            for feed in feeds:
                channel_id = self.extract_channel_id(feed['feed_url'])
                if channel_id and not channel_id.startswith('@'):
                    if channel_id not in channel_feeds:
                        channel_feeds[channel_id] = []
                    channel_feeds[channel_id].append(feed)
            
            # Check each unique channel for live status
            for channel_id, feeds_for_channel in channel_feeds.items():
                try:
                    live_info = await self.check_channel_live(channel_id)
                    
                    if live_info:
                        video_id = live_info.get('video_id')
                        
                        # Check if we already notified for this live stream
                        if self.live_channels.get(channel_id) == video_id:
                            continue
                        
                        # Send notification to all feeds tracking this channel
                        for feed in feeds_for_channel:
                            content_info = {
                                'title': live_info.get('title', 'Live Stream'),
                                'url': f"https://youtube.com/watch?v={video_id}",
                                'channel_name': live_info.get('channel_name', 'YouTube Channel'),
                                'thumbnail': live_info.get('thumbnail', f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"),
                                'video_id': video_id,
                                'game': 'Live Stream'  # YouTube doesn't have game category like Twitch
                            }
                            
                            await self.send_notification(feed, content_info, is_live=True)
                        
                        # Mark as notified
                        self.live_channels[channel_id] = video_id
                        logging.info(f"[Live] Sent live notification for channel: {channel_id}, video: {video_id}")
                    else:
                        # Channel is not live, clear from tracking
                        if channel_id in self.live_channels:
                            del self.live_channels[channel_id]
                            
                    await asyncio.sleep(0.5)  # Rate limit API calls
                    
                except Exception as e:
                    logging.error(f"[Live] Error checking channel {channel_id}: {e}")
                    
        except Exception as e:
            logging.error(f"Live check error: {e}")
        finally:
            conn.close()

    async def check_channel_live(self, channel_id: str) -> dict | None:
        """Check if a YouTube channel is currently live using YouTube Data API"""
        try:
            session = await self.get_session()
            
            # Use search API to find live broadcasts from this channel
            url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                'part': 'snippet',
                'channelId': channel_id,
                'eventType': 'live',
                'type': 'video',
                'key': YOUTUBE_API_KEY
            }
            
            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    logging.warning(f"[Live] API error for {channel_id}: {resp.status} - {error_text}")
                    return None
                    
                data = await resp.json()
                
            items = data.get('items', [])
            
            if items:
                item = items[0]
                snippet = item.get('snippet', {})
                
                return {
                    'video_id': item.get('id', {}).get('videoId'),
                    'title': snippet.get('title', 'Live Stream'),
                    'channel_name': snippet.get('channelTitle', 'YouTube Channel'),
                    'thumbnail': snippet.get('thumbnails', {}).get('high', {}).get('url', '')
                }
                
            return None
            
        except asyncio.TimeoutError:
            logging.warning(f"[Live] Timeout checking channel: {channel_id}")
            return None
        except Exception as e:
            logging.error(f"[Live] Error checking channel {channel_id}: {e}")
            return None

    async def subscribe_to_pubsub(self, channel_id: str, cursor, conn):
        """Subscribe a YouTube channel to PubSubHubbub for realtime notifications"""
        if channel_id.startswith('@'):
            return  # Can't subscribe to handles directly
            
        topic_url = f"https://www.youtube.com/xml/feeds/videos.xml?channel_id={channel_id}"
        
        try:
            session = await self.get_session()
            
            data = {
                'hub.callback': WEBHOOK_CALLBACK_URL,
                'hub.topic': topic_url,
                'hub.verify': 'async',
                'hub.mode': 'subscribe',
                'hub.lease_seconds': '432000'  # 5 days
            }
            
            async with session.post(YOUTUBE_HUB_URL, data=data) as resp:
                if resp.status in [202, 204]:
                    logging.info(f"[PubSub] Subscription request sent for channel: {channel_id}")
                else:
                    text = await resp.text()
                    logging.warning(f"[PubSub] Subscription failed for {channel_id}: {resp.status} - {text}")
                    
        except Exception as e:
            logging.error(f"[PubSub] Error subscribing {channel_id}: {e}")

    async def process_webhook_events(self, cursor, conn):
        """Process events received via PubSubHubbub webhook (stored in youtube_live_events)"""
        try:
            # Get unprocessed events
            cursor.execute("""
                SELECT yle.*, nf.id as feed_id, nf.guild_id, nf.discord_channel_id, nf.custom_message_json
                FROM youtube_live_events yle
                JOIN notifications_feeds nf ON (
                    nf.feed_url LIKE CONCAT('%', yle.channel_id, '%')
                    OR nf.feed_url LIKE CONCAT('%', yle.channel_name, '%')
                )
                WHERE yle.is_processed = 0 
                AND nf.is_enabled = 1
                AND nf.type = 'youtube'
                ORDER BY yle.created_at ASC
                LIMIT 10
            """)
            events = cursor.fetchall()
            
            for event in events:
                try:
                    # Build content info
                    content_info = {
                        'title': event.get('video_title', 'New Video'),
                        'url': f"https://youtube.com/watch?v={event['video_id']}",
                        'channel_name': event.get('channel_name', 'YouTube Channel'),
                        'thumbnail': f"https://i.ytimg.com/vi/{event['video_id']}/maxresdefault.jpg",
                        'video_id': event['video_id']
                    }
                    
                    # Build feed object for send_notification
                    feed = {
                        'id': event['feed_id'],
                        'guild_id': event['guild_id'],
                        'discord_channel_id': event['discord_channel_id'],
                        'custom_message_json': event['custom_message_json'],
                        'type': 'youtube',
                        'feed_url': ''
                    }
                    
                    await self.send_notification(feed, content_info)
                    
                    # Mark as processed
                    cursor.execute(
                        "UPDATE youtube_live_events SET is_processed = 1, processed_at = NOW() WHERE id = %s",
                        (event['id'],)
                    )
                    conn.commit()
                    
                    logging.info(f"[Webhook] Sent notification for video: {event['video_id']}")
                    
                except Exception as e:
                    logging.error(f"[Webhook] Error processing event {event.get('id')}: {e}")
                    
        except Exception as e:
            logging.error(f"[Webhook] Error fetching events: {e}")

    async def process_feed(self, feed, cursor, conn):
        """RSS Fallback: Check YouTube RSS feed for new videos"""
        feed_url = feed['feed_url']
        channel_id = self.extract_channel_id(feed_url)
        
        if not channel_id:
            return
            
        # Initialize notified set for this feed
        if feed['id'] not in self.notified_videos:
            self.notified_videos[feed['id']] = set()
        
        # For handles, try to get from RSS directly
        if channel_id.startswith('@'):
            rss_url = f"https://www.youtube.com/feeds/videos.xml?user={channel_id[1:]}"
        else:
            rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
            # Also ensure we're subscribed to PubSub
            await self.ensure_subscription(channel_id, cursor, conn)
        
        try:
            session = await self.get_session()
            async with session.get(rss_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return
                    
                xml_text = await resp.text()
                
            # Parse RSS feed
            videos = self.parse_youtube_rss(xml_text)
            
            if not videos:
                return
                
            # Check for new videos (only process the latest one to avoid spam)
            latest_video = videos[0]
            video_id = latest_video.get('video_id')
            
            if video_id and video_id not in self.notified_videos[feed['id']]:
                # Check if this video was already processed via webhook
                cursor.execute(
                    "SELECT id FROM youtube_live_events WHERE video_id = %s AND is_processed = 1",
                    (video_id,)
                )
                if cursor.fetchone():
                    # Already notified via webhook
                    self.notified_videos[feed['id']].add(video_id)
                    return
                
                # Check publish time - only notify for videos less than 24 hours old
                published = latest_video.get('published')
                if published:
                    try:
                        pub_time = datetime.fromisoformat(published.replace('Z', '+00:00'))
                        if datetime.now(pub_time.tzinfo) - pub_time > timedelta(hours=24):
                            self.notified_videos[feed['id']].add(video_id)
                            return
                    except:
                        pass
                
                content_info = {
                    'title': latest_video.get('title', 'New Video'),
                    'url': f"https://youtube.com/watch?v={video_id}",
                    'channel_name': latest_video.get('author', 'YouTube Channel'),
                    'thumbnail': f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg",
                    'video_id': video_id
                }
                
                await self.send_notification(feed, content_info)
                self.notified_videos[feed['id']].add(video_id)
                
                # Keep set size manageable
                if len(self.notified_videos[feed['id']]) > 50:
                    self.notified_videos[feed['id']] = set(list(self.notified_videos[feed['id']])[-25:])
                    
                logging.info(f"[RSS] Sent notification for video: {video_id}")
                
        except asyncio.TimeoutError:
            logging.warning(f"[RSS] Timeout fetching feed for {channel_id}")
        except Exception as e:
            logging.error(f"[RSS] Error processing feed {feed['id']}: {e}")

    async def ensure_subscription(self, channel_id: str, cursor, conn):
        """Ensure channel is subscribed to PubSubHubbub"""
        try:
            cursor.execute(
                "SELECT status, expires_at FROM youtube_subscriptions WHERE channel_id = %s",
                (channel_id,)
            )
            row = cursor.fetchone()
            
            if not row or row['status'] != 'active' or (row['expires_at'] and row['expires_at'] < datetime.now() + timedelta(hours=12)):
                await self.subscribe_to_pubsub(channel_id, cursor, conn)
                
        except Exception as e:
            logging.error(f"Error checking subscription: {e}")

    def parse_youtube_rss(self, xml_text: str) -> list:
        """Parse YouTube RSS/Atom feed"""
        videos = []
        try:
            root = ET.fromstring(xml_text)
            ns = {
                'atom': 'http://www.w3.org/2005/Atom',
                'yt': 'http://www.youtube.com/xml/schemas/2015',
                'media': 'http://search.yahoo.com/mrss/'
            }
            
            for entry in root.findall('atom:entry', ns):
                video_id = entry.find('yt:videoId', ns)
                title = entry.find('atom:title', ns)
                author = entry.find('atom:author/atom:name', ns)
                published = entry.find('atom:published', ns)
                
                if video_id is not None:
                    videos.append({
                        'video_id': video_id.text,
                        'title': title.text if title is not None else 'Untitled',
                        'author': author.text if author is not None else 'Unknown',
                        'published': published.text if published is not None else None
                    })
                    
        except ET.ParseError as e:
            logging.error(f"XML parse error: {e}")
            
        return videos

    async def send_notification(self, feed, content_info, is_live=False):
        """Sends the notification to Discord using custom or default message settings"""
        channel = self.bot.get_channel(int(feed['discord_channel_id']))
        if not channel:
            return

        # content_info should contain: title, thumbnail, url, channel_name, game (optional)
        
        custom_msg = feed['custom_message_json']
        if custom_msg:
            if isinstance(custom_msg, str):
                custom_msg = json.loads(custom_msg)
            await self.send_custom_embed(channel, custom_msg, content_info)
        else:
            # Send Premium Default Embed
            await self.send_default_embed(channel, feed, content_info, is_live)

    async def send_default_embed(self, channel, feed, content, is_live=False):
        """Sends a beautiful default embed if no custom one is set"""
        feed_type = feed['type']
        
        # Check if this is a live stream notification
        if is_live or feed_type == 'live':
            embed = discord.Embed(
                title=f"🔴 {content.get('channel_name', 'Streamer')} is LIVE!",
                description=f"Don't miss out! **{content.get('channel_name', 'Streamer')}** sedang live streaming sekarang!\n\n**[{content.get('title', 'Stream Title')}]({content.get('url', feed.get('feed_url', ''))})**\n\nGas masuk sekarang! ✨",
                color=0xFF0000,
                timestamp=datetime.utcnow()
            )
            if content.get('thumbnail'):
                embed.set_image(url=content['thumbnail'])
            message_text = f"🔴 Hey @everyone, **{content.get('channel_name', 'Seseorang')}** is LIVE!"
        else:
            # Regular video upload
            embed = discord.Embed(
                title=f"📹 New YouTube Video!",
                description=f"**{content.get('channel_name', 'Artist')}** baru saja mengunggah video baru!\n\n**[{content.get('title', 'Video Title')}]({content.get('url', feed.get('feed_url', ''))})**\n\nYuk buruan tonton! 🔥",
                color=0xFF0000,
                timestamp=datetime.utcnow()
            )
            if content.get('thumbnail'):
                embed.set_image(url=content['thumbnail'])
            message_text = f"🔔 Hey @everyone, **{content.get('channel_name', 'Seseorang')}** baru upload video!"

        embed.set_footer(text="Don Pollo Notifications", icon_url=self.bot.user.avatar.url if self.bot.user.avatar else None)
        await channel.send(content=message_text, embed=embed)

    async def send_custom_embed(self, channel, data, content):
        """Helper to send the complex message object from dashboard with variable replacement"""
        text_content = data.get('message_content', '')
        
        # Simple Variable Replacement
        def replace_vars(text):
            if not text: return text
            replacements = {
                '{content.title}': content.get('title', ''),
                '{content.url}': content.get('url', ''),
                '{channel.name}': content.get('channel_name', ''),
                '{content.game}': content.get('game', ''),
            }
            for k, v in replacements.items():
                text = text.replace(k, str(v))
            return text

        text_content = replace_vars(text_content)
        embeds = []
        
        for e_data in data.get('embeds', []):
            embed = discord.Embed(
                title=replace_vars(e_data.get('title')),
                description=replace_vars(e_data.get('description')),
                color=int(e_data.get('color', '#FFD700').replace('#', ''), 16) if e_data.get('color') else 0xFFD700,
                url=content.get('url') if not e_data.get('url') else replace_vars(e_data.get('url'))
            )
            
            if e_data.get('image_url'):
                img_url = replace_vars(e_data['image_url'])
                if img_url == '{content.thumbnail}': img_url = content.get('thumbnail', '')
                embed.set_image(url=img_url)
                
            if e_data.get('thumbnail_url'):
                thumb_url = replace_vars(e_data['thumbnail_url'])
                if thumb_url == '{content.thumbnail}': thumb_url = content.get('thumbnail', '')
                embed.set_thumbnail(url=thumb_url)

            if e_data.get('footer_text'):
                embed.set_footer(text=replace_vars(e_data['footer_text']), icon_url=replace_vars(e_data.get('footer_icon_url')))
            
            embeds.append(embed)
            
        await channel.send(content=text_content, embeds=embeds)

    @notification_check.before_loop
    async def before_notification_check(self):
        await self.bot.wait_until_ready()

    @subscription_check.before_loop
    async def before_subscription_check(self):
        await self.bot.wait_until_ready()

    @live_check.before_loop
    async def before_live_check(self):
        await self.bot.wait_until_ready()

async def setup(bot):
    await bot.add_cog(Notification(bot))
