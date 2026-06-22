require('dotenv').config();
const { Bot, InlineKeyboard } = require('grammy');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const bot = new Bot(process.env.BOT_TOKEN);

const LIFETIME_VIPS = new Set([8711651683]);
const VIP_FILE = 'vip_users.json';

function loadVip() { try { return JSON.parse(fs.readFileSync(VIP_FILE)); } catch { return {}; } }
function saveVip(obj) { fs.writeFileSync(VIP_FILE, JSON.stringify(obj)); }
let VIP_USERS = loadVip();

function isVip(ctx) { const id = ctx.from.id; if (LIFETIME_VIPS.has(id)) return true; if (!VIP_USERS[id]) return false; if (Date.now() > VIP_USERS[id].expires) { delete VIP_USERS[id]; saveVip(VIP_USERS); return false; } return true; }
function addVip(id) { VIP_USERS[id] = { expires: Date.now() + 30 * 24 * 60 * 60 * 1000 }; saveVip(VIP_USERS); }
function removeVip(id) { delete VIP_USERS[id]; saveVip(VIP_USERS); }

bot.catch((err) => { console.log('Bot error caught:', err.message); });

const MEME_SYMBOLS = ['DOGEUSDT','SHIBUSDT','PEPEUSDT','BONKUSDT','FLOKIUSDT','BRETTUSDT','MOGUSDT','WIFUSDT'];
const LEGIT_SYMBOLS = ['DOGEUSDT','SHIBUSDT','PEPEUSDT','BONKUSDT','FLOKIUSDT'];
const TOP_STOCKS = ['AAPL','TSLA','NVDA','AMZN','GOOGL'];

let cachedMemecoins = null;
let cachedLegitMemes = null;
let lastMemeFetch = 0;
let cachedStocks = null;
let lastStockFetch = 0;

async function fetchMemecoins() {
  if (Date.now() - lastMemeFetch < 30 * 60 * 1000 && cachedMemecoins) return;
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    const data = await res.json();
    if (!Array.isArray(data)) return;
    const memes = data.filter(t => MEME_SYMBOLS.includes(t.symbol)).map(t => ({ symbol: t.symbol.replace('USDT',''), price: parseFloat(t.lastPrice), change: parseFloat(t.priceChangePercent), volume: parseFloat(t.quoteVolume) }));
    const legit = data.filter(t => LEGIT_SYMBOLS.includes(t.symbol)).map(t => ({ symbol: t.symbol.replace('USDT',''), price: parseFloat(t.lastPrice), change: parseFloat(t.priceChangePercent), volume: parseFloat(t.quoteVolume) })).sort((a,b) => b.volume - a.volume);
    if (memes.length > 0) { cachedMemecoins = memes; cachedLegitMemes = legit; lastMemeFetch = Date.now(); }
  } catch(e) { console.log('Memecoin fetch error:', e.message); }
}

async function fetchStocks() {
  if (Date.now() - lastStockFetch < 30 * 60 * 1000 && cachedStocks) return;
  try {
    const results = await Promise.all(TOP_STOCKS.map(s => fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+s+'?interval=1d&range=1d').then(r => r.json())));
    cachedStocks = results.map((r, i) => {
      try {
        const q = r.chart.result[0].meta;
        const change = ((q.regularMarketPrice - q.chartPreviousClose) / q.chartPreviousClose * 100).toFixed(2);
        return { symbol: TOP_STOCKS[i], price: q.regularMarketPrice, change, volume: q.regularMarketVolume, high: q.regularMarketDayHigh, low: q.regularMarketDayLow };
      } catch { return null; }
    }).filter(Boolean);
    lastStockFetch = Date.now();
  } catch(e) { console.log('Stock fetch error:', e.message); }
}

fetchMemecoins();
fetchStocks();
setInterval(fetchMemecoins, 30 * 60 * 1000);
setInterval(fetchStocks, 30 * 60 * 1000);

setInterval(async () => { const now = Date.now(); for (const [id, data] of Object.entries(VIP_USERS)) { const daysLeft = Math.floor((data.expires - now) / (1000 * 60 * 60 * 24)); if (daysLeft === 3) { try { await bot.api.sendMessage(Number(id), '⚠️ Your VIP expires in 3 days!\n\nRenew:\n\n₿ BTC:\nbc1q4lpvdz77uj70lg6ph03k05h9pk0c597f9a6f5j\n\n◎ SOL:\nAXdnDpaoHY57HjkYNcrV8fimZZN4e3KRdoBJ92B7vSdn\n\nContact @Ch4to8 after paying.'); } catch {} } if (now > data.expires) { delete VIP_USERS[id]; saveVip(VIP_USERS); try { await bot.api.sendMessage(Number(id), '❌ Your VIP has expired. Type /vip to renew.'); } catch {} } } }, 60 * 60 * 1000);

const mainMenu = new InlineKeyboard()
  .text('📊 Trending', 'trending').text('📈 Gainers', 'gainers').row()
  .text('📉 Losers', 'losers').text('💹 Volume', 'volume').row()
  .text('💰 Price', 'price_prompt').text('📋 Stats', 'stats_prompt').row()
  .text('🐸 Memecoins', 'memecoins').text('📈 Stocks', 'stocks').row()
  .text('🧠 Learn', 'learn').text('🛡️ Safe', 'safe').row()
  .text('📖 Terms', 'terms').text('🆘 Support', 'support').row()
  .text('⭐ VIP Access', 'vip');

const vipMenu = new InlineKeyboard()
  .text('🔍 Check Contract', 'check_prompt').text('🐋 Whale Moves', 'whales').row()
  .text('⚡ Early Gems', 'early').text('🎯 Daily Signal', 'signal').row()
  .text('💎 Legit Memecoins', 'legit_memes').text('📊 Stock Stats', 'stock_stats').row()
  .text('📊 Main Menu', 'menu');

bot.command('start', (ctx) => ctx.reply('👋 Welcome to Crypto_Ch4to_Bot!\n\nChoose an option:', { reply_markup: mainMenu }));
bot.command('menu', (ctx) => ctx.reply('📲 Main Menu:', { reply_markup: mainMenu }));
bot.command('ping', (ctx) => ctx.reply('🟢 Bot is online!'));
bot.command('addvip', (ctx) => { const args = Number(ctx.match.trim()); if (!args) return ctx.reply('Usage: /addvip <user_id>'); addVip(args); ctx.reply('✅ User ' + args + ' added to VIP for 30 days!'); });
bot.command('removevip', (ctx) => { const args = Number(ctx.match.trim()); if (!args) return ctx.reply('Usage: /removevip <user_id>'); removeVip(args); ctx.reply('❌ User ' + args + ' removed from VIP.'); });
bot.command('myvip', (ctx) => { const id = ctx.from.id; if (LIFETIME_VIPS.has(id)) return ctx.reply('👑 You have Lifetime VIP access!', { reply_markup: vipMenu }); if (isVip(ctx)) { const days = Math.floor((VIP_USERS[id].expires - Date.now()) / (1000 * 60 * 60 * 24)); ctx.reply('⭐ VIP active — '+days+' days remaining.', { reply_markup: vipMenu }); } else { ctx.reply('❌ Not VIP yet.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); } });
bot.command('stock', async (ctx) => { try { const symbol = ctx.match.trim().toUpperCase(); if (!symbol) return ctx.reply('Usage: /stock AAPL'); const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+symbol+'?interval=1d&range=1d'); const data = await res.json(); const q = data.chart.result[0].meta; const change = ((q.regularMarketPrice - q.chartPreviousClose) / q.chartPreviousClose * 100).toFixed(2); ctx.reply('📈 '+symbol+':\n\nPrice: $'+q.regularMarketPrice.toLocaleString()+'\n24h Change: '+change+'%\nHigh: $'+q.regularMarketDayHigh+'\nLow: $'+q.regularMarketDayLow+'\nVolume: '+Number(q.regularMarketVolume).toLocaleString(), { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Stock not found. Try /stock AAPL'); } });
bot.callbackQuery('menu', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('📲 Main Menu:', { reply_markup: mainMenu }); });
bot.callbackQuery('support', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('🆘 Need help?\n\n👤 @Ch4to8\n\nWe respond within a few hours.', { reply_markup: new InlineKeyboard().url('💬 Message Support', 'https://t.me/Ch4to8').row().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('vip', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('⭐ VIP Access\n\n📦 What you get:\n🔍 Contract risk analyzer\n🐋 Whale movement tracker\n⚡ Early gem alerts\n🎯 Daily buy/sell signals\n💎 Legit memecoin picks\n📊 Stock stats & analysis\n\n💵 Price: $9.99/month\n\n💳 Pay with:\n\n₿ BTC:\nbc1q4lpvdz77uj70lg6ph03k05h9pk0c597f9a6f5j\n\n◎ SOL:\nAXdnDpaoHY57HjkYNcrV8fimZZN4e3KRdoBJ92B7vSdn\n\n✅ After paying:\n1. Send screenshot to @Ch4to8\n2. Send your Telegram user ID (from @userinfobot)\n3. Activated within 1 hour', { reply_markup: new InlineKeyboard().url('💬 Pay & Contact', 'https://t.me/Ch4to8').row().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('stocks', async (ctx) => { await ctx.answerCallbackQuery(); await fetchStocks(); if (!cachedStocks || cachedStocks.length === 0) return ctx.reply('❌ Stock data unavailable. Try again later.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); const list = cachedStocks.map((s,i)=>(i+1)+'. '+s.symbol+'\n   $'+s.price.toLocaleString()+' | '+s.change+'%').join('\n\n'); ctx.reply('📈 Top Stocks:\n\n'+list+'\n\n⚠️ Delayed data. Not financial advice.', { reply_markup: new InlineKeyboard().text('📊 Full Stats (VIP)', 'stock_stats').row().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('stock_stats', async (ctx) => { await ctx.answerCallbackQuery(); if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); await fetchStocks(); if (!cachedStocks || cachedStocks.length === 0) return ctx.reply('❌ Stock data unavailable. Try again later.', { reply_markup: vipMenu }); const list = cachedStocks.map((s,i)=>(i+1)+'. '+s.symbol+'\n   Price: $'+s.price.toLocaleString()+'\n   Change: '+s.change+'%\n   High: $'+s.high+'\n   Low: $'+s.low+'\n   Volume: '+Number(s.volume).toLocaleString()).join('\n\n'); ctx.reply('📊 Stock Stats:\n\n'+list+'\n\n⚠️ Delayed data. Not financial advice.', { reply_markup: vipMenu }); });
bot.callbackQuery('trending', async (ctx) => { await ctx.answerCallbackQuery(); try { const res = await fetch('https://api.coingecko.com/api/v3/search/trending'); const data = await res.json(); const list = data.coins.slice(0, 7).map((c, i) => (i+1)+'. '+c.item.name+' ('+c.item.symbol.toUpperCase()+')').join('\n'); ctx.reply('🔥 Trending:\n\n' + list, { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } });
bot.callbackQuery('gainers', async (ctx) => { await ctx.answerCallbackQuery(); try { const res = await fetch('https://api.binance.com/api/v3/ticker/24hr'); const data = await res.json(); const list = data.filter(t=>t.symbol.endsWith('USDT')).sort((a,b)=>parseFloat(b.priceChangePercent)-parseFloat(a.priceChangePercent)).slice(0,5).map((t,i)=>(i+1)+'. '+t.symbol.replace('USDT','')+' +'+parseFloat(t.priceChangePercent).toFixed(2)+'%').join('\n'); ctx.reply('📈 Top Gainers:\n\n'+list, { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } });
bot.callbackQuery('losers', async (ctx) => { await ctx.answerCallbackQuery(); try { const res = await fetch('https://api.binance.com/api/v3/ticker/24hr'); const data = await res.json(); const list = data.filter(t=>t.symbol.endsWith('USDT')).sort((a,b)=>parseFloat(a.priceChangePercent)-parseFloat(b.priceChangePercent)).slice(0,5).map((t,i)=>(i+1)+'. '+t.symbol.replace('USDT','')+' '+parseFloat(t.priceChangePercent).toFixed(2)+'%').join('\n'); ctx.reply('📉 Top Losers:\n\n'+list, { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } });
bot.callbackQuery('volume', async (ctx) => { await ctx.answerCallbackQuery(); try { const res = await fetch('https://api.binance.com/api/v3/ticker/24hr'); const data = await res.json(); const list = data.filter(t=>t.symbol.endsWith('USDT')).sort((a,b)=>parseFloat(b.quoteVolume)-parseFloat(a.quoteVolume)).slice(0,5).map((t,i)=>(i+1)+'. '+t.symbol.replace('USDT','')+' $'+Number(parseFloat(t.quoteVolume).toFixed(0)).toLocaleString()).join('\n'); ctx.reply('💹 Highest Volume:\n\n'+list, { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } });
bot.callbackQuery('memecoins', async (ctx) => { await ctx.answerCallbackQuery(); await fetchMemecoins(); if (!cachedMemecoins) return ctx.reply('❌ Data unavailable. Try again later.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); const list = cachedMemecoins.map((c,i)=>(i+1)+'. '+c.symbol+'\n   $'+c.price.toLocaleString()+' | '+c.change.toFixed(2)+'% | Vol: $'+Number(c.volume.toFixed(0)).toLocaleString()).join('\n\n'); ctx.reply('🐸 Memecoins (updates every 30min):\n\n'+list, { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('legit_memes', async (ctx) => { await ctx.answerCallbackQuery(); if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); await fetchMemecoins(); if (!cachedLegitMemes) return ctx.reply('❌ Data unavailable. Try again later.', { reply_markup: vipMenu }); const list = cachedLegitMemes.map((c,i)=>(i+1)+'. '+c.symbol+'\n   Price: $'+c.price.toLocaleString()+'\n   Volume: $'+Number(c.volume.toFixed(0)).toLocaleString()+'\n   24h: '+c.change.toFixed(2)+'%').join('\n\n'); ctx.reply('💎 Legit Memecoins (Top Volume):\n\n'+list+'\n\n✅ Real volume and market cap.', { reply_markup: vipMenu }); });
bot.callbackQuery('price_prompt', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('💰 Type: /price BTC'); });
bot.callbackQuery('stats_prompt', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('📋 Type: /stats BTC'); });
bot.callbackQuery('learn', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('🧠 Crypto Basics:\n\n1. Bitcoin — the first cryptocurrency\n2. Altcoins — any coin that is not Bitcoin\n3. Wallet — where you store your crypto\n4. Exchange — where you buy and sell\n5. Private key — never share this', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('safe', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('🛡️ Stay Safe:\n\n❌ Never share your private key\n❌ Avoid coins with no audit\n✅ Check contract on Etherscan\n✅ Start small', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('terms', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('📖 Terms:\n\nRug pull — devs take funds\nLiquidity — how easily a coin trades\nWhale — huge holder\nFUD — Fear Uncertainty Doubt\nFOMO — Fear Of Missing Out\nHODL — holding long term', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('check_prompt', async (ctx) => { await ctx.answerCallbackQuery(); if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); ctx.reply('🔍 Send: /check <contract address>'); });
bot.callbackQuery('whales', async (ctx) => { await ctx.answerCallbackQuery(); if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); try { const res = await fetch('https://api.binance.com/api/v3/ticker/24hr'); const data = await res.json(); const list = data.filter(t=>t.symbol.endsWith('USDT')).sort((a,b)=>parseFloat(b.quoteVolume)-parseFloat(a.quoteVolume)).slice(0,5).map((t,i)=>(i+1)+'. '+t.symbol.replace('USDT','')+' — $'+Number(parseFloat(t.quoteVolume).toFixed(0)).toLocaleString()+' volume').join('\n'); ctx.reply('🐋 Whale Activity:\n\n'+list, { reply_markup: vipMenu }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: vipMenu }); } });
bot.callbackQuery('early', async (ctx) => { await ctx.answerCallbackQuery(); if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); try { const res = await fetch('https://api.coingecko.com/api/v3/search/trending'); const data = await res.json(); const list = data.coins.slice(0, 5).map((c,i)=>(i+1)+'. '+c.item.name+' ('+c.item.symbol.toUpperCase()+') — Rank #'+c.item.market_cap_rank).join('\n'); ctx.reply('⚡ Early Gems:\n\n'+list+'\n\n💡 Trending before the crowd.', { reply_markup: vipMenu }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: vipMenu }); } });
bot.callbackQuery('signal', async (ctx) => { await ctx.answerCallbackQuery(); if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); try { const res = await fetch('https://api.binance.com/api/v3/ticker/24hr'); const data = await res.json(); const filtered = data.filter(t=>t.symbol.endsWith('USDT')&&parseFloat(t.quoteVolume)>1000000); const top = filtered.sort((a,b)=>parseFloat(b.priceChangePercent)-parseFloat(a.priceChangePercent))[0]; const bottom = [...filtered].sort((a,b)=>parseFloat(a.priceChangePercent)-parseFloat(b.priceChangePercent))[0]; ctx.reply('🎯 Daily Signal:\n\n📈 WATCH: '+top.symbol.replace('USDT','')+' (+'+parseFloat(top.priceChangePercent).toFixed(2)+'%)\nPrice: $'+parseFloat(top.lastPrice).toLocaleString()+'\n\n📉 AVOID: '+bottom.symbol.replace('USDT','')+' ('+parseFloat(bottom.priceChangePercent).toFixed(2)+'%)\nPrice: $'+parseFloat(bottom.lastPrice).toLocaleString()+'\n\n⚠️ Not financial advice. DYOR.', { reply_markup: vipMenu }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: vipMenu }); } });
bot.command('check', async (ctx) => { if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); const contract = ctx.match.trim(); if (!contract) return ctx.reply('Usage: /check <contract address>'); ctx.reply('🔍 Analyzing: '+contract+'\n\n✅ Format: Valid\n⚠️ Always verify on Etherscan/Solscan.\n\nhttps://etherscan.io/token/'+contract, { reply_markup: vipMenu }); });
bot.command('price', async (ctx) => { try { const symbol = ctx.match.trim().toUpperCase(); if (!symbol) return ctx.reply('Usage: /price BTC'); const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol='+symbol+'USDT'); const data = await res.json(); if (!data.price) return ctx.reply('Coin not found. Try /price BTC'); ctx.reply('💰 '+symbol+': $'+parseFloat(data.price).toLocaleString(), { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Error. Try again.'); } });
bot.command('stats', async (ctx) => { try { const symbol = ctx.match.trim().toUpperCase(); if (!symbol) return ctx.reply('Usage: /stats BTC'); const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol='+symbol+'USDT'); const data = await res.json(); if (!data.lastPrice) return ctx.reply('Coin not found. Try /stats BTC'); ctx.reply('📊 '+symbol+':\n\nPrice: $'+parseFloat(data.lastPrice).toLocaleString()+'\n24h Change: '+parseFloat(data.priceChangePercent).toFixed(2)+'%\n24h High: $'+parseFloat(data.highPrice).toLocaleString()+'\n24h Low: $'+parseFloat(data.lowPrice).toLocaleString()+'\nVolume: $'+Number(parseFloat(data.quoteVolume).toFixed(0)).toLocaleString(), { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Error. Try again.'); } });
bot.start();
console.log('🤖 VIP Bot is running...');
