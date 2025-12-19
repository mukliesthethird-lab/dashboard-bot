from discord.ext import commands

class Warn(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        print("⚠️ Warning: Warn extension is deprecated. Please remove 'Warn' from your load_extensions list.")

async def setup(bot):
    await bot.add_cog(Warn(bot))
