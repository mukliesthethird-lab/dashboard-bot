import discord
from discord import app_commands
from discord.ext import commands, tasks
import json
import logging
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
import re
import os
from utils.database import get_db_connection
from datetime import datetime

class Notification(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        # Storage for last notified IDs to avoid spam
        self.last_notified_video = {}  # {feed_id: last_video_id}
        self.live_status = {}  # {feed_id: {'is_live': bool, 'video_id': str}}
        
        # Start both tasks
        self.video_check.start()
        self.live_check.start()

    def cog_unload(self):
        self.video_check.cancel()
        self.live_check.cancel()

    # ==================== YOUTUBE API FUNCTIONS ====================

    async def get_youtube_api_key(self):
        """Get YouTube API key from environment"""
        return os.getenv('YOUTUBE_API_KEY')

    async def check_youtube_live_status(self, session, channel_id: str) -> dict | None:
        """Check if a YouTube channel is currently live using YouTube Data API"""
        api_key = await self.get_youtube_api_key()
        if not api_key:
            logging.warning("YOUTUBE_API_KEY not found in environment variables")
            return None
        
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            'part': 'snippet',
            'channelId': channel_id,
            'eventType': 'live',
            'type': 'video',
            'key': api_key
        }
        
        try:
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get('items') and len(data['items']) > 0:
                        # Channel is LIVE!
                        item = data['items'][0]
                        return {
                            'video_id': item['id']['videoId'],
                            'title': item['snippet']['title'],
                            'channel_name': item['snippet']['channelTitle'],
                            'thumbnail': item['snippet']['thumbnails'].get('high', {}).get('url', ''),
                            'is_live': True
                        }
                elif resp.status == 403:
                    logging.error("YouTube API quota exceeded or invalid API key")
                else:
                    logging.error(f"YouTube API error: {resp.status}")
        except Exception as e:
            logging.error(f"Error checking YouTube live status: {e}")
        
        return None

    # ==================== LIVE STREAM CHECK (Every 1 minute) ====================

    @tasks.loop(minutes=1)
    async def live_check(self):
        """Background task to check for live streams using YouTube API"""
        api_key = await self.get_youtube_api_key()
        if not api_key:
            return  # Skip if no API key
        
        logging.info("Starting LIVE stream check cycle...")
        conn = get_db_connection()
        if not conn:
            return
        
        try:
            cursor = conn.cursor(dictionary=True)
            # Get all enabled 'live' type feeds
            cursor.execute("SELECT * FROM notifications_feeds WHERE is_enabled = 1 AND type = 'live'")
            feeds = cursor.fetchall()
            
            async with aiohttp.ClientSession() as session:
                for feed in feeds:
                    try:
                        await self.process_live_feed(session, feed)
                    except Exception as e:
                        logging.error(f"Error processing live feed {feed['id']}: {e}")
                        
        except Exception as e:
            logging.error(f"Live check error: {e}")
        finally:
            conn.close()

    async def process_live_feed(self, session, feed):
        """Check if a channel is currently live and send notification"""
        feed_id = feed['id']
        url = feed['feed_url']
        
        # Only process YouTube live feeds
        is_yt = 'youtube.com' in url or 'youtu.be' in url or '/@' in url
        if not is_yt:
            return
        
        # Get channel ID
        channel_id = await self.get_youtube_channel_id(session, url)
        if not channel_id:
            logging.warning(f"Could not extract channel ID for: {url}")
            return
        
        # Check live status via API
        live_data = await self.check_youtube_live_status(session, channel_id)
        
        prev_status = self.live_status.get(feed_id, {'is_live': False, 'video_id': None})
        
        if live_data and live_data.get('is_live'):
            # Channel is LIVE
            video_id = live_data['video_id']
            
            # Only notify if just went live (was not live before OR different stream)
            if not prev_status['is_live'] or prev_status.get('video_id') != video_id:
                logging.info(f"🔴 LIVE DETECTED: {live_data['channel_name']} - {live_data['title']}")
                
                content_info = {
                    'title': live_data['title'],
                    'url': f"https://www.youtube.com/watch?v={video_id}",
                    'thumbnail': live_data['thumbnail'] or f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
                    'channel_name': live_data['channel_name'],
                    'game': 'Live Stream',
                    'is_live': True
                }
                
                await self.send_notification(feed, content_info, notification_type='live')
                
            # Update status
            self.live_status[feed_id] = {'is_live': True, 'video_id': video_id}
        else:
            # Channel is not live
            if prev_status['is_live']:
                logging.info(f"⚫ Stream ended for feed {feed_id}")
            self.live_status[feed_id] = {'is_live': False, 'video_id': None}

    # ==================== VIDEO UPLOAD CHECK (Every 3 minutes) ====================

    @tasks.loop(minutes=3)
    async def video_check(self):
        """Background task to check for new video uploads via RSS"""
        logging.info("Starting VIDEO upload check cycle...")
        conn = get_db_connection()
        if not conn:
            return
        
        try:
            cursor = conn.cursor(dictionary=True)
            # Get all enabled 'youtube' type feeds (for video uploads)
            cursor.execute("SELECT * FROM notifications_feeds WHERE is_enabled = 1 AND type = 'youtube'")
            feeds = cursor.fetchall()
            
            async with aiohttp.ClientSession() as session:
                for feed in feeds:
                    try:
                        await self.process_video_feed(session, feed)
                    except Exception as e:
                        logging.error(f"Error processing video feed {feed['id']}: {e}")
                        
        except Exception as e:
            logging.error(f"Video check error: {e}")
        finally:
            conn.close()
            logging.info("Video check cycle completed.")

    async def process_video_feed(self, session, feed):
        """Check for new video uploads via YouTube RSS feed"""
        feed_id = feed['id']
        url = feed['feed_url']
        
        is_yt = 'youtube.com' in url or 'youtu.be' in url or '/@' in url
        if not is_yt:
            return
        
        # Get channel ID
        channel_id = await self.get_youtube_channel_id(session, url)
        if not channel_id:
            return
        
        # Fetch RSS feed
        rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
        try:
            async with session.get(rss_url) as resp:
                if resp.status != 200:
                    logging.error(f"RSS fetch failed ({resp.status}) for {rss_url}")
                    return
                xml_text = await resp.text()
        except Exception as e:
            logging.error(f"RSS fetch error: {e}")
            return
        
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as e:
            logging.error(f"XML parse error: {e}")
            return
            
        ns = {'ns': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015'}
        
        entry = root.find('ns:entry', ns)
        if entry is None:
            return
        
        video_id_el = entry.find('yt:videoId', ns)
        video_id = video_id_el.text if video_id_el is not None else None
        if not video_id:
            return
        
        # Check if already notified
        if self.last_notified_video.get(feed_id) == video_id:
            return
        
        title_el = entry.find('ns:title', ns)
        author_el = root.find('ns:title', ns)
        title = title_el.text if title_el is not None else "Unknown Title"
        author_name = author_el.text if author_el is not None else "Unknown Channel"
        
        content_info = {
            'title': title,
            'url': f"https://www.youtube.com/watch?v={video_id}",
            'thumbnail': f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
            'channel_name': author_name,
            'game': None,
            'is_live': False
        }
        
        # First-run check - don't spam old videos
        if feed_id in self.last_notified_video:
            logging.info(f"📹 NEW VIDEO: {author_name} - {title}")
            await self.send_notification(feed, content_info, notification_type='video')
        else:
            logging.info(f"First-run: Caching video ID {video_id} for {author_name}")
        
        self.last_notified_video[feed_id] = video_id

    # ==================== HELPER FUNCTIONS ====================

    async def get_youtube_channel_id(self, session, url):
        """Tries to extract or fetch the channel ID from various YT URL formats"""
        # Direct channel ID format
        match = re.search(r'channel/(UC[a-zA-Z0-9_-]{22})', url)
        if match:
            return match.group(1)
        
        # UC format in URL
        match = re.search(r'(UC[a-zA-Z0-9_-]{22})', url)
        if match:
            return match.group(1)
        
        # Handle @handle or custom URLs - need to fetch page
        try:
            async with session.get(url, allow_redirects=True) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    # Look for channel ID in page source
                    match = re.search(r'"channelId":"(UC[a-zA-Z0-9_-]{22})"', text)
                    if match:
                        return match.group(1)
                    # Alternative pattern
                    match = re.search(r'channel/(UC[a-zA-Z0-9_-]{22})', text)
                    if match:
                        return match.group(1)
        except Exception as e:
            logging.error(f"Error fetching channel ID from URL: {e}")
        
        return None

    async def send_notification(self, feed, content_info, notification_type='video'):
        """Sends the notification to Discord using custom or default message settings"""
        channel = self.bot.get_channel(int(feed['discord_channel_id']))
        if not channel:
            logging.warning(f"Channel {feed['discord_channel_id']} not found for feed {feed['id']}")
            return

        custom_msg = feed['custom_message_json']
        
        # Parse JSON string if needed
        if custom_msg and isinstance(custom_msg, str):
            try:
                custom_msg = json.loads(custom_msg)
            except json.JSONDecodeError:
                custom_msg = None
        
        # Check if custom_msg is valid
        if custom_msg and isinstance(custom_msg, dict) and (custom_msg.get('message_content') or custom_msg.get('embeds')):
            await self.send_custom_embed(channel, custom_msg, content_info)
        else:
            await self.send_default_embed(channel, feed, content_info, notification_type)

    async def send_default_embed(self, channel, feed, content, notification_type='video'):
        """Sends a beautiful default embed if no custom one is set"""
        is_live = content.get('is_live', False) or notification_type == 'live'
        
        if is_live:
            # LIVE STREAM EMBED
            embed = discord.Embed(
                title=f"🔴 {content.get('channel_name', 'Streamer')} is LIVE!",
                description=f"**{content.get('channel_name', 'Streamer')}** sedang **LIVE** sekarang!\n\n**[{content.get('title', 'Stream')}]({content.get('url')})**\n\n> Jangan sampai ketinggalan! Gas masuk sekarang! 🔥",
                color=0xFF0000,
                timestamp=datetime.utcnow()
            )
            ping_msg = f"🔴 **LIVE NOW!** @everyone, **{content.get('channel_name', 'Streamer')}** sedang live streaming!"
        else:
            # VIDEO UPLOAD EMBED
            embed = discord.Embed(
                title=f"📹 New YouTube Video!",
                description=f"**{content.get('channel_name', 'Creator')}** baru saja upload video baru!\n\n**[{content.get('title', 'Video')}]({content.get('url')})**\n\n> Yuk buruan tonton! 🎬",
                color=0xFF0000,
                timestamp=datetime.utcnow()
            )
            ping_msg = f"📹 **NEW VIDEO!** @everyone, **{content.get('channel_name', 'Creator')}** upload video baru!"
        
        if content.get('thumbnail'):
            embed.set_image(url=content['thumbnail'])
        
        embed.set_footer(text="Don Pollo Notifications", icon_url=self.bot.user.avatar.url if self.bot.user.avatar else None)
        
        try:
            await channel.send(content=ping_msg, embed=embed)
            logging.info(f"Notification sent to #{channel.name}")
        except Exception as e:
            logging.error(f"Failed to send notification: {e}")

    async def send_custom_embed(self, channel, data, content):
        """Helper to send the complex message object from dashboard with variable replacement"""
        text_content = data.get('message_content', '') or ''
        
        # Variable Replacement
        def replace_vars(text):
            if not text:
                return text
            replacements = {
                '{content.title}': content.get('title', ''),
                '{content.url}': content.get('url', ''),
                '{channel.name}': content.get('channel_name', ''),
                '{content.game}': content.get('game', '') or '',
                '{content.thumbnail}': content.get('thumbnail', ''),
            }
            for k, v in replacements.items():
                text = text.replace(k, str(v) if v else '')
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
                
                img_url = replace_vars(e_data.get('image_url', ''))
                if img_url:
                    embed.set_image(url=img_url)
                    
                thumb_url = replace_vars(e_data.get('thumbnail_url', ''))
                if thumb_url:
                    embed.set_thumbnail(url=thumb_url)

                footer_text = replace_vars(e_data.get('footer_text', ''))
                if footer_text:
                    embed.set_footer(text=footer_text, icon_url=replace_vars(e_data.get('footer_icon_url', '')))
                
                embeds.append(embed)
            except Exception as e:
                logging.error(f"Error building embed: {e}")
            
        try:
            await channel.send(content=text_content, embeds=embeds if embeds else None)
        except Exception as e:
            logging.error(f"Failed to send custom embed: {e}")

    # ==================== COMMANDS ====================

    @app_commands.command(name="notifications-status", description="Cek status sistem notifikasi bot")
    @app_commands.checks.has_permissions(administrator=True)
    async def notifications_status(self, interaction: discord.Interaction):
        """Checks the status of the notification system"""
        api_key = await self.get_youtube_api_key()
        
        video_status = "✅ Running" if self.video_check.is_running() else "❌ Stopped"
        live_status = "✅ Running" if self.live_check.is_running() else "❌ Stopped"
        api_status = "✅ Configured" if api_key else "⚠️ Not Set (Live detection disabled)"
        
        embed = discord.Embed(
            title="🔔 Notification System Status",
            color=0x00FF00 if api_key else 0xFFA500,
            timestamp=datetime.utcnow()
        )
        embed.add_field(name="📹 Video Check (RSS)", value=f"{video_status}\nInterval: 3 minutes", inline=True)
        embed.add_field(name="🔴 Live Check (API)", value=f"{live_status}\nInterval: 1 minute", inline=True)
        embed.add_field(name="🔑 YouTube API Key", value=api_status, inline=False)
        embed.add_field(name="📊 Cached Data", value=f"Videos: {len(self.last_notified_video)}\nLive States: {len(self.live_status)}", inline=False)
        
        await interaction.response.send_message(embed=embed)

    @app_commands.command(name="check-notifications", description="Paksa bot nge-cek video/live baru sekarang")
    @app_commands.checks.has_permissions(administrator=True)
    async def force_check_notifications(self, interaction: discord.Interaction):
        """Forces a check of all notification feeds"""
        await interaction.response.send_message("🔍 Checking for updates... Please wait.", ephemeral=True)
        
        # Run both checks
        await asyncio.gather(
            self.video_check(),
            self.live_check()
        )
        
        await interaction.followup.send("✅ Check completed! Check logs for details.")

    @video_check.before_loop
    async def before_video_check(self):
        await self.bot.wait_until_ready()

    @live_check.before_loop
    async def before_live_check(self):
        await self.bot.wait_until_ready()

async def setup(bot):
    await bot.add_cog(Notification(bot))

