export interface Command {
  name: string;
  description: string;
  usage: string;
  category: string;
  permissions?: string;
}

export interface Fish {
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  base_price: number;
  min_weight: number;
  max_weight: number;
  image_url: string;
}

export const COMMANDS: Command[] = [
  // ECONOMY
  { name: 'balance', description: 'Check your balance or another users coin balance.', usage: '/balance [user]', category: 'Economy' },
  { name: 'pay', description: 'Transfer coins to another user.', usage: '/pay <user> <amount>', category: 'Economy' },
  { name: 'daily', description: 'Claim a free daily bonus (every 24 hours).', usage: '/daily', category: 'Economy' },
  { name: 'work', description: 'Work to earn daily coins.', usage: '/work', category: 'Economy' },
  { name: 'ngutang', description: 'Borrow coins from the bots bank (Due in 24 hours).', usage: '/ngutang <amount>', category: 'Economy' },
  { name: 'pay_loan', description: 'Pay your debt early to avoid fines.', usage: '/pay_loan', category: 'Economy' },
  { name: 'leaderboard', description: 'View the richest players rankings on the server.', usage: '/leaderboard', category: 'Economy' },
  { name: 'slot', description: 'Play the slot machine with coin bets.', usage: '/slot <bet>', category: 'Economy' },
  { name: 'dadu', description: 'Play a dice guessing game with bets.', usage: '/dadu <number> <bet>', category: 'Economy' },
  { name: 'coinflip', description: 'Flip a coin (Heads/Tails) with bets.', usage: '/coinflip <choice> <bet>', category: 'Economy' },
  
  // FISHING
  { name: 'fish catch', description: 'Start catching fish in the fishing area.', usage: '/fish catch', category: 'Fishing' },
  { name: 'fish inventory', description: 'View your fish collection and fishing items.', usage: '/fish inventory', category: 'Fishing' },
  { name: 'fish rod', description: 'Change or view the status of the fishing rod in use.', usage: '/fish rod', category: 'Fishing' },
  { name: 'fish shop', description: 'Buy a new rod or fishing buff items.', usage: '/fish shop', category: 'Fishing' },
  { name: 'fish quests', description: 'View and claim daily/weekly fishing missions.', usage: '/fish quests', category: 'Fishing' },
  { name: 'fish catalog', description: 'View a list of all types of fish that can be caught.', usage: '/fish catalog', category: 'Fishing' },
  { name: 'fish salvage', description: 'Convert fish into scrap materials for upgrades.', usage: '/fish salvage', category: 'Fishing' },
  { name: 'fish forge', description: 'Forge/Upgrade your fishing rod to make it stronger.', usage: '/fish forge', category: 'Fishing' },
  { name: 'fish trade', description: 'Trade fish with another user safely.', usage: '/fish trade <user>', category: 'Fishing' },
  
  // MUSIC
  { name: 'play', description: 'Play music from YouTube, Spotify, or SoundCloud.', usage: '/play <query/url>', category: 'Music' },
  { name: 'lyrics', description: 'Search for lyrics of the song currently playing.', usage: '/lyrics', category: 'Music' },
  { name: 'nowplaying', description: 'Display details of the song currently playing.', usage: '/nowplaying', category: 'Music' },
  { name: 'queue', description: 'View the list of songs in the queue.', usage: '/queue', category: 'Music' },
  { name: 'history', description: 'View the history of recently played songs.', usage: '/history', category: 'Music' },
  { name: 'volume', description: 'Adjust the music player volume (0-150).', usage: '/volume <value>', category: 'Music' },
  { name: 'effects', description: 'Apply audio effects like Bassboost or Nightcore.', usage: '/effects', category: 'Music' },
  { name: 'autoplay', description: 'Turn on/off automatic song playback.', usage: '/autoplay', category: 'Music' },
  { name: 'skip', description: 'Skip the song currently playing.', usage: '/skip', category: 'Music' },
  { name: 'skipto', description: 'Jump to a specific song in the queue.', usage: '/skipto <index>', category: 'Music' },
  { name: 'stop', description: 'Stop music and clear all queues.', usage: '/stop', category: 'Music' },
  { name: 'clear', description: 'Delete all songs from the queue list.', usage: '/clear', category: 'Music' },
  { name: 'leave', description: 'Remove the bot from the Voice Channel.', usage: '/leave', category: 'Music' },
  
  // MODERATION
  { name: 'kick', description: 'Kick a member from the server.', usage: '/kick <user> [reason]', category: 'Moderation', permissions: 'Kick Members' },
  { name: 'ban', description: 'Block a member from the server forever.', usage: '/ban <user> [reason]', category: 'Moderation', permissions: 'Ban Members' },
  { name: 'mute', description: 'Mute a user (Timeout) temporarily.', usage: '/mute <user> <duration> [reason]', category: 'Moderation', permissions: 'Moderate Members' },
  { name: 'unmute', description: 'Remove the mute/timeout status of a user.', usage: '/unmute <user>', category: 'Moderation', permissions: 'Moderate Members' },
  { name: 'warn', description: 'Give a formal warning to a member.', usage: '/warn <user> <reason>', category: 'Moderation', permissions: 'Manage Server' },
  { name: 'warnings', description: 'View the list of violations of a user.', usage: '/warnings <user>', category: 'Moderation', permissions: 'Manage Server' },
  { name: 'purge', description: 'Delete mass messages in the channel (max 100).', usage: '/purge <amount>', category: 'Moderation', permissions: 'Manage Messages' },
  { name: 'report', description: 'Report a user who violates rules to the admin.', usage: '/report <user> <reason>', category: 'Moderation' },
  
  // FUN & GAMES
  { name: 'xox', description: 'Play Tic-Tac-Toe with coin bets.', usage: '/xox <user> <bet>', category: 'Fun/Games' },
  { name: 'rps', description: 'Play Rock Paper Scissors with friends.', usage: '/rps <user> <bet>', category: 'Fun/Games' },
  { name: 'tebakangka', description: 'Guess a number from 1-100 to win prizes.', usage: '/tebakangka', category: 'Fun/Games' },
  { name: 'pubg', description: 'Check a players PUBG profile stats.', usage: '/pubg <ign>', category: 'Fun/Games' },
  { name: 'valorant', description: 'Check a players VALORANT stats (Riot ID).', usage: '/valorant <riot_id>', category: 'Fun/Games' },
  { name: 'roll', description: 'Roll a random number between 0 and the maximum value.', usage: '/roll [max]', category: 'Fun/Games' },
  { name: 'choose', description: 'Let the bot choose from the options you provide.', usage: '/choose <option1>, <option2>...', category: 'Fun/Games' },
  
  // GENERAL & UTILITY
  { name: 'profile', description: 'View your interactive profile card.', usage: '/profile [user]', category: 'General' },
  { name: 'level', description: 'Check your XP level and rank card.', usage: '/level [user]', category: 'General' },
  { name: 'setbackground', description: 'Change your profile cards background image.', usage: '/setbackground <url>', category: 'General' },
  { name: 'avatar', description: 'Display a users profile photo (Avatar).', usage: '/avatar [user]', category: 'General' },
  { name: 'userinfo', description: 'View detailed information about a Discord account.', usage: '/userinfo [user]', category: 'General' },
  { name: 'serverinfo', description: 'View complete information about this server.', usage: '/serverinfo', category: 'General' },
  { name: 'poll', description: 'Create an interactive poll with buttons.', usage: '/poll <question> | <opt1> | <opt2>...', category: 'General' },
  { name: 'remind', description: 'Ask the bot to remind you later.', usage: '/remind <time> <text>', category: 'General' },
  { name: 'ping', description: 'Check the bots response speed.', usage: '/ping', category: 'General' },
  { name: 'invite', description: 'Get the link to invite this bot.', usage: '/invite', category: 'General' },
  { name: 'about', description: 'Technical information about the bot system.', usage: '/about', category: 'General' },

  // AI
  { name: 'ask', description: 'Ask anything to Don Pollo AI (GPT-4 Turbo).', usage: '/ask <prompt>', category: 'AI' },
  { name: 'imagine', description: 'Generate AI images from your text prompt.', usage: '/imagine <prompt>', category: 'AI' },
];

export const FISH_DATA: Fish[] = [
  // COMMON
  { name: "Ikan Mas", rarity: "Common", base_price: 10, min_weight: 0.5, max_weight: 2.0, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445356966728831027/Ikan_Mas.png" },
  { name: "Lele", rarity: "Common", base_price: 12, min_weight: 0.8, max_weight: 3.0, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445355853338120283/Lele.png" },
  { name: "Nila", rarity: "Common", base_price: 15, min_weight: 0.5, max_weight: 2.5, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445357306832355450/Nila.png" },
  { name: "Sepat", rarity: "Common", base_price: 8, min_weight: 0.1, max_weight: 0.5, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445357801856565258/Ikan_Sepat.png" },
  { name: "Mujair", rarity: "Common", base_price: 10, min_weight: 0.4, max_weight: 1.5, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445359331825422457/Ikan_Mujair.png" },

  // UNCOMMON
  { name: "Gurame", rarity: "Uncommon", base_price: 25, min_weight: 1.0, max_weight: 5.0, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445359847431209140/Gurame.png" },
  { name: "Patin", rarity: "Uncommon", base_price: 30, min_weight: 2.0, max_weight: 8.0, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445361905760997507/Ikan_Patin.png" },
  { name: "Bandeng", rarity: "Uncommon", base_price: 35, min_weight: 1.0, max_weight: 4.0, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445363601589141605/Bandeng.png" },

  // RARE
  { name: "Kakap Merah", rarity: "Rare", base_price: 80, min_weight: 3.0, max_weight: 12.0, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445369385224114217/Kakap_Merah.png" },
  { name: "Salmon", rarity: "Rare", base_price: 120, min_weight: 5.0, max_weight: 25.0, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445370016064082081/Salmon.png" },

  // EPIC
  { name: "Arowana Merah", rarity: "Epic", base_price: 2500, min_weight: 2.0, max_weight: 7.0, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445374909726457906/Arwana_Merah.png" },
  { name: "Black Marlin", rarity: "Epic", base_price: 5000, min_weight: 20.0, max_weight: 80.0, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445377979193622628/bLACK_MARLIN.png" },

  // LEGENDARY
  { name: "Blue Marlin", rarity: "Legendary", base_price: 13000, min_weight: 80.0, max_weight: 300.0, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445380445851226248/Blue_Marlin.png" },
  { name: "Megalodon", rarity: "Legendary", base_price: 20000, min_weight: 8000.0, max_weight: 30000.0, image_url: "https://media.discordapp.net/attachments/1080697175291469936/1445383272518651934/Megalodon.png" },
];

export const PREMIUM_TIERS = [
  {
    name: 'Free',
    price: 'Rp 0',
    description: 'Standard features for small servers.',
    features: ['Access All Basic Features', 'Standard Economy & Fishing', 'Music Support', '3 Reaction Roles Limit'],
    buttonText: 'Current Plan',
    highlight: false
  },
  {
    name: 'Supporter',
    price: 'Rp 15,000',
    period: '/month',
    description: 'Support development and get cool perks.',
    features: ['Donator Profile Badge', '2x Daily Reward', '15% Shop Discount', 'Custom Welcome Background', 'Priority Music Queue'],
    buttonText: 'Choose Supporter',
    highlight: true,
    color: 'indigo'
  },
  {
    name: 'Legend',
    price: 'Rp 50,000',
    period: '/month',
    description: 'Highest tier for premium communities.',
    features: ['Legendary Profile Badge', '3x Daily Reward', '30% Shop Discount', 'Premium Custom Voice', 'Unlimited Reaction Roles', 'Early Access Features'],
    buttonText: 'Become Legend',
    highlight: false,
    color: 'emerald'
  }
];

export interface Donor {
  name: string;
  amount: string;
  message: string;
  date: string;
  tier: 'Gold' | 'Silver' | 'Bronze';
}

export const DONORS: Donor[] = [
  { name: 'BantengFam', amount: 'Rp 100.000', message: 'Semangat terus kembangin Don Pollo!', date: '2026-03-28', tier: 'Gold' },
  { name: 'Kepin Kece', amount: 'Rp 50.000', message: 'Bot musik terbaik di Indo.', date: '2026-03-25', tier: 'Silver' },
  { name: 'Rizky Ganteng', amount: 'Rp 20.000', message: 'Mantap bang fitur fishingnya.', date: '2026-03-20', tier: 'Bronze' },
  { name: 'Anonim', amount: 'Rp 15.000', message: 'Dukung terus!', date: '2026-03-15', tier: 'Bronze' },
];
