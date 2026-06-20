require('dotenv').config();
const { Bot } = require('grammy');

const bot = new Bot(process.env.BOT_TOKEN);

bot.command('start', (ctx) => ctx.reply('👋 Welcome to *Crypto\\_Ch4to\\_Bot*!\nType /help to see all commands.', { parse_mode: 'Markdown' }));

bot.command('help', (ctx) => ctx.reply(`*Commands*\n\n📊 *Market*\n/trending — Top trending coins\n/gainers — Top 24h gainers\n/losers — Top 24h losers\n\n🔎 *Analysis*\n/price — Get coin price\n/stats — Market stats\n\n🧠 *Learn*\n/learn — Beginner lessons\n/terms — Crypto glossary\n/safe — Scam avoidance tips\n\n⚙️ *Utility*\n/ping — Check bot status\n/disclaimer — Risk warning`, { parse_mode: 'Markdown' }));

bot.command('ping', (ctx) => ctx.reply('🟢 Bot is online!'));

bot.command('disclaimer', (ctx) => ctx.reply('⚠️ *Disclaimer*\nNothing here is financial advice. Always do your own research.', { parse_mode: 'Markdown' }));

['trending', 'gainers', 'losers', 'learn', 'terms', 'safe'].forEach(cmd => {
  bot.command(cmd, (ctx) => ctx.reply(`🔧 /${cmd} coming soon!`));
});

bot.start();
console.log('🤖 Bot is running...');
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const reply = (chatId, text) =>
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });

bot.onText(/\/start/, (msg) => {
  reply(msg.chat.id, `👋 Welcome to *Crypto\\_Ch4to\\_Bot*!\nType /help to see all commands.`);
});

bot.onText(/\/help/, (msg) => {
  reply(msg.chat.id, `*Commands*\n\n📊 *Market*\n/trending — Top trending coins\n/gainers — Top 24h gainers\n/losers — Top 24h losers\n\n🔎 *Analysis*\n/price <symbol> — Get coin price\n/stats <symbol> — Market stats\n\n🧠 *Learn*\n/learn — Beginner lessons\n/terms — Crypto glossary\n/safe — Scam avoidance tips\n\n⚙️ *Utility*\n/ping — Check bot status\n/disclaimer — Risk warning`);
});

bot.onText(/\/ping/, (msg) => {
  reply(msg.chat.id, '🟢 Bot is online!');
});

bot.onText(/\/disclaimer/, (msg) => {
  reply(msg.chat.id, '⚠️ *Disclaimer*\nNothing here is financial advice. Always do your own research.');
});

const placeholders = ['/trending', '/gainers', '/losers', '/learn', '/terms', '/safe'];
placeholders.forEach(cmd => {
  bot.onText(new RegExp(`\\${cmd}`), (msg) => {
    reply(msg.chat.id, `🔧 *${cmd}* coming soon!`);
  });
});

console.log('🤖 Bot is running...');

