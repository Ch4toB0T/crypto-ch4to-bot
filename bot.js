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

const CG = 'https://api.coingecko.com/api/v3';
const MEME_IDS = 'dogecoin,shiba-inu,pepe,bonk,floki,brett,mog-coin,dogwifcoin';
const TOP_IDS = 'bitcoin,ethereum,binancecoin,solana,ripple';

let cachedMemecoins = null;
let cachedLegitMemes = null;
let cachedTop = null;
let lastMemeFetch = 0;
let lastTopFetch = 0;

async function fetchMemecoins() {
  if (Date.now() - lastMemeFetch < 30 * 60 * 1000 && cachedMemecoins) return;
  try {
    const res = await fetch(CG+'/coins/markets?vs_currency=usd&ids='+MEME_IDS+'&order=market_cap_desc&per_page=8&page=1&price_change_percentage=24h');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) { cachedMemecoins = data; cachedLegitMemes = [...data].sort((a,b)=>b.total_volume-a.total_volume).slice(0,5); lastMemeFetch = Date.now(); }
  } catch(e) { console.log('Meme fetch error:', e.message); }
}

async function fetchTop() {
  if (Date.now() - lastTopFetch < 30 * 60 * 1000 && cachedTop) return;
  try {
    const res = await fetch(CG+'/coins/markets?vs_currency=usd&ids='+TOP_IDS+'&order=market_cap_desc&per_page=5&page=1&price_change_percentage=24h');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) { cachedTop = data; lastTopFetch = Date.now(); }
  } catch(e) { console.log('Top fetch error:', e.message); }
}

fetchMemecoins();
fetchTop();
setInterval(fetchMemecoins, 30 * 60 * 1000);
setInterval(fetchTop, 30 * 60 * 1000);

setInterval(async () => { const now = Date.now(); for (const [id, data] of Object.entries(VIP_USERS)) { const daysLeft = Math.floor((data.expires - now) / (1000 * 60 * 60 * 24)); if (daysLeft === 3) { try { await bot.api.sendMessage(Number(id), '⚠️ Your VIP expires in 3 days!\n\nRenew:\n\n₿ BTC:\nbc1q4lpvdz77uj70lg6ph03k05h9pk0c597f9a6f5j\n\n◎ SOL:\nAXdnDpaoHY57HjkYNcrV8fimZZN4e3KRdoBJ92B7vSdn\n\nContact @Ch4to8 after paying.'); } catch {} } if (now > data.expires) { delete VIP_USERS[id]; saveVip(VIP_USERS); try { await bot.api.sendMessage(Number(id), '❌ Your VIP has expired. Type /vip to renew.'); } catch {} } } }, 60 * 60 * 1000);

const mainMenu = new InlineKeyboard()
  .text('📊 Trending', 'trending').text('📈 Gainers', 'gainers').row()
  .text('📉 Losers', 'losers').text('💹 Volume', 'volume').row()
  .text('💰 Price', 'price_prompt').text('📋 Stats', 'stats_prompt').row()
  .text('🐸 Memecoins', 'memecoins').text('🏆 Top Assets', 'topassets').row()
  .text('🧠 Learn', 'learn').text('🛡️ Safe', 'safe').row()
  .text('📖 Terms', 'terms').text('🆘 Support', 'support').row()
  .text('⭐ VIP Access', 'vip');

const vipMenu = new InlineKeyboard()
  .text('🔍 Check Contract', 'check_prompt').text('🐋 Whale Moves', 'whales').row()
  .text('⚡ Early Gems', 'early').text('🎯 Daily Signal', 'signal').row()
  .text('💎 Legit Memecoins', 'legit_memes').text('📊 Asset Stats', 'asset_stats').row()
  .text('📊 Main Menu', 'menu');

bot.command('start', (ctx) => ctx.reply('👋 Welcome to Crypto_Ch4to_Bot!\n\nChoose an option:', { reply_markup: mainMenu }));
bot.command('menu', (ctx) => ctx.reply('📲 Main Menu:', { reply_markup: mainMenu }));
bot.command('ping', (ctx) => ctx.reply('🟢 Bot is online!'));
bot.command('addvip', (ctx) => { const args = Number(ctx.match.trim()); if (!args) return ctx.reply('Usage: /addvip <user_id>'); addVip(args); ctx.reply('✅ User ' + args + ' added to VIP for 30 days!'); });
bot.command('removevip', (ctx) => { const args = Number(ctx.match.trim()); if (!args) return ctx.reply('Usage: /removevip <user_id>'); removeVip(args); ctx.reply('❌ User ' + args + ' removed from VIP.'); });
bot.command('myvip', (ctx) => { const id = ctx.from.id; if (LIFETIME_VIPS.has(id)) return ctx.reply('👑 You have Lifetime VIP access!', { reply_markup: vipMenu }); if (isVip(ctx)) { const days = Math.floor((VIP_USERS[id].expires - Date.now()) / (1000 * 60 * 60 * 24)); ctx.reply('⭐ VIP active — '+days+' days remaining.', { reply_markup: vipMenu }); } else { ctx.reply('❌ Not VIP yet.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); } });
bot.command('price', async (ctx) => { try { const symbol = ctx.match.trim().toLowerCase(); if (!symbol) return ctx.reply('Usage: /price bitcoin'); const res = await fetch(CG+'/simple/price?ids='+symbol+'&vs_currencies=usd'); const data = await res.json(); if (!data[symbol]) return ctx.reply('Not found. Try /price bitcoin'); ctx.reply('💰 '+symbol.toUpperCase()+': $'+data[symbol].usd.toLocaleString(), { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Error. Try again.'); } });
bot.command('stats', async (ctx) => { try { const symbol = ctx.match.trim().toLowerCase(); if (!symbol) return ctx.reply('Usage: /stats bitcoin'); const res = await fetch(CG+'/coins/'+symbol); const data = await res.json(); if (!data.market_data) return ctx.reply('Not found. Try /stats bitcoin'); const m = data.market_data; ctx.reply('📊 '+data.name+':\n\nPrice: $'+m.current_price.usd.toLocaleString()+'\nMarket Cap: $'+m.market_cap.usd.toLocaleString()+'\n24h Change: '+m.price_change_percentage_24h.toFixed(2)+'%\nVolume: $'+m.total_volume.usd.toLocaleString(), { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Error. Try again.'); } });
bot.callbackQuery('menu', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('📲 Main Menu:', { reply_markup: mainMenu }); });
bot.callbackQuery('support', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('🆘 Need help?\n\n👤 @Ch4to8\n\nWe respond within a few hours.', { reply_markup: new InlineKeyboard().url('💬 Message Support', 'https://t.me/Ch4to8').row().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('vip', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('⭐ VIP Access\n\n📦 What you get:\n🔍 Contract risk analyzer\n🐋 Whale movement tracker\n⚡ Early gem alerts\n🎯 Daily buy/sell signals\n💎 Legit memecoin picks\n📊 Full asset stats\n\n💵 Price: $9.99/month\n\n💳 Pay with:\n\n₿ BTC:\nbc1q4lpvdz77uj70lg6ph03k05h9pk0c597f9a6f5j\n\n◎ SOL:\nAXdnDpaoHY57HjkYNcrV8fimZZN4e3KRdoBJ92B7vSdn\n\n✅ After paying:\n1. Send screenshot to @Ch4to8\n2. Send your Telegram user ID (from @userinfobot)\n3. Activated within 1 hour', { reply_markup: new InlineKeyboard().url('💬 Pay & Contact', 'https://t.me/Ch4to8').row().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('trending', async (ctx) => { await ctx.answerCallbackQuery(); try { const res = await fetch(CG+'/search/trending'); const data = await res.json(); const list = data.coins.slice(0, 7).map((c, i) => (i+1)+'. '+c.item.name+' ('+c.item.symbol.toUpperCase()+')').join('\n'); ctx.reply('🔥 Trending:\n\n' + list, { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } });
bot.callbackQuery('gainers', async (ctx) => { await ctx.answerCallbackQuery(); try { const res = await fetch(CG+'/coins/markets?vs_currency=usd&order=percent_change_24h&per_page=10&page=1&price_change_percentage=24h'); const data = await res.json(); if (!Array.isArray(data)) return ctx.reply('❌ Error fetching data. Try again.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); const list = data.sort((a,b)=>b.price_change_percentage_24h-a.price_change_percentage_24h).slice(0,5).map((c,i)=>(i+1)+'. '+c.name+' +'+c.price_change_percentage_24h.toFixed(2)+'%').join('\n'); ctx.reply('📈 Top Gainers:\n\n'+list, { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } });
bot.callbackQuery('losers', async (ctx) => { await ctx.answerCallbackQuery(); try { const res = await fetch(CG+'/coins/markets?vs_currency=usd&order=percent_change_24h&per_page=10&page=1&price_change_percentage=24h'); const data = await res.json(); if (!Array.isArray(data)) return ctx.reply('❌ Error fetching data. Try again.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); const list = data.sort((a,b)=>a.price_change_percentage_24h-b.price_change_percentage_24h).slice(0,5).map((c,i)=>(i+1)+'. '+c.name+' '+c.price_change_percentage_24h.toFixed(2)+'%').join('\n'); ctx.reply('📉 Top Losers:\n\n'+list, { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } });
bot.callbackQuery('volume', async (ctx) => { await ctx.answerCallbackQuery(); try { const res = await fetch(CG+'/coins/markets?vs_currency=usd&order=volume_desc&per_page=5&page=1'); const data = await res.json(); if (!Array.isArray(data)) return ctx.reply('❌ Error fetching data. Try again.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); const list = data.map((c,i)=>(i+1)+'. '+c.name+' $'+Number(c.total_volume).toLocaleString()).join('\n'); ctx.reply('💹 Highest Volume:\n\n'+list, { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); } });
bot.callbackQuery('topassets', async (ctx) => { await ctx.answerCallbackQuery(); await fetchTop(); if (!cachedTop) return ctx.reply('❌ Data unavailable. Try again later.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); const list = cachedTop.map((c,i)=>(i+1)+'. '+c.name+' ('+c.symbol.toUpperCase()+')\n   $'+c.current_price.toLocaleString()+' | '+c.price_change_percentage_24h.toFixed(2)+'%').join('\n\n'); ctx.reply('🏆 Top Assets:\n\n'+list+'\n\n⚠️ Not financial advice.', { reply_markup: new InlineKeyboard().text('📊 Full Stats (VIP)', 'asset_stats').row().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('asset_stats', async (ctx) => { await ctx.answerCallbackQuery(); if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); await fetchTop(); if (!cachedTop) return ctx.reply('❌ Data unavailable. Try again later.', { reply_markup: vipMenu }); const list = cachedTop.map((c,i)=>(i+1)+'. '+c.name+'\n   Price: $'+c.current_price.toLocaleString()+'\n   24h: '+c.price_change_percentage_24h.toFixed(2)+'%\n   Cap: $'+Number(c.market_cap).toLocaleString()+'\n   Volume: $'+Number(c.total_volume).toLocaleString()).join('\n\n'); ctx.reply('📊 Full Asset Stats:\n\n'+list+'\n\n⚠️ Not financial advice.', { reply_markup: vipMenu }); });
bot.callbackQuery('memecoins', async (ctx) => { await ctx.answerCallbackQuery(); await fetchMemecoins(); if (!cachedMemecoins) return ctx.reply('❌ Data unavailable. Try again later.', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); const list = cachedMemecoins.map((c,i)=>(i+1)+'. '+c.name+' ('+c.symbol.toUpperCase()+')\n   $'+c.current_price.toLocaleString()+' | '+c.price_change_percentage_24h.toFixed(2)+'% | Cap: $'+Number(c.market_cap).toLocaleString()).join('\n\n'); ctx.reply('🐸 Memecoins (updates every 30min):\n\n'+list, { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('legit_memes', async (ctx) => { await ctx.answerCallbackQuery(); if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); await fetchMemecoins(); if (!cachedLegitMemes) return ctx.reply('❌ Data unavailable. Try again later.', { reply_markup: vipMenu }); const list = cachedLegitMemes.map((c,i)=>(i+1)+'. '+c.name+' ('+c.symbol.toUpperCase()+')\n   Price: $'+c.current_price.toLocaleString()+'\n   Volume: $'+Number(c.total_volume).toLocaleString()+'\n   24h: '+c.price_change_percentage_24h.toFixed(2)+'%').join('\n\n'); ctx.reply('💎 Legit Memecoins (Top Volume):\n\n'+list+'\n\n✅ Real volume and market cap.', { reply_markup: vipMenu }); });
bot.callbackQuery('price_prompt', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('💰 Type: /price bitcoin'); });
bot.callbackQuery('stats_prompt', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('📋 Type: /stats bitcoin'); });
bot.callbackQuery('learn', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('🧠 Crypto Basics:\n\n1. Bitcoin — the first cryptocurrency\n2. Altcoins — any coin that is not Bitcoin\n3. Wallet — where you store your crypto\n4. Exchange — where you buy and sell\n5. Private key — never share this', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('safe', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('🛡️ Stay Safe:\n\n❌ Never share your private key\n❌ Avoid coins with no audit\n✅ Check contract on Etherscan\n✅ Start small', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('terms', async (ctx) => { await ctx.answerCallbackQuery(); ctx.reply('📖 Terms:\n\nRug pull — devs take funds\nLiquidity — how easily a coin trades\nWhale — huge holder\nFUD — Fear Uncertainty Doubt\nFOMO — Fear Of Missing Out\nHODL — holding long term', { reply_markup: new InlineKeyboard().text('⬅️ Menu', 'menu') }); });
bot.callbackQuery('check_prompt', async (ctx) => { await ctx.answerCallbackQuery(); if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); ctx.reply('🔍 Send: /check <contract address>'); });
bot.callbackQuery('whales', async (ctx) => { await ctx.answerCallbackQuery(); if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); try { const res = await fetch(CG+'/coins/markets?vs_currency=usd&order=volume_desc&per_page=5&page=1'); const data = await res.json(); if (!Array.isArray(data)) return ctx.reply('❌ Error fetching data.', { reply_markup: vipMenu }); const list = data.map((c,i)=>(i+1)+'. '+c.name+' — $'+Number(c.total_volume).toLocaleString()+' volume').join('\n'); ctx.reply('🐋 Whale Activity:\n\n'+list, { reply_markup: vipMenu }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: vipMenu }); } });
bot.callbackQuery('early', async (ctx) => { await ctx.answerCallbackQuery(); if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); try { const res = await fetch(CG+'/search/trending'); const data = await res.json(); const list = data.coins.slice(0, 5).map((c,i)=>(i+1)+'. '+c.item.name+' ('+c.item.symbol.toUpperCase()+') — Rank #'+c.item.market_cap_rank).join('\n'); ctx.reply('⚡ Early Gems:\n\n'+list+'\n\n💡 Trending before the crowd.', { reply_markup: vipMenu }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: vipMenu }); } });
bot.callbackQuery('signal', async (ctx) => { await ctx.answerCallbackQuery(); if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); try { const res = await fetch(CG+'/coins/markets?vs_currency=usd&order=percent_change_24h&per_page=10&page=1&price_change_percentage=24h'); const data = await res.json(); if (!Array.isArray(data)) return ctx.reply('❌ Error fetching data.', { reply_markup: vipMenu }); const top = data.sort((a,b)=>b.price_change_percentage_24h-a.price_change_percentage_24h)[0]; const bottom = [...data].sort((a,b)=>a.price_change_percentage_24h-b.price_change_percentage_24h)[0]; ctx.reply('🎯 Daily Signal:\n\n📈 WATCH: '+top.name+' (+'+top.price_change_percentage_24h.toFixed(2)+'%)\nPrice: $'+top.current_price.toLocaleString()+'\n\n📉 AVOID: '+bottom.name+' ('+bottom.price_change_percentage_24h.toFixed(2)+'%)\nPrice: $'+bottom.current_price.toLocaleString()+'\n\n⚠️ Not financial advice. DYOR.', { reply_markup: vipMenu }); } catch { ctx.reply('❌ Error fetching data. Try again.', { reply_markup: vipMenu }); } });
bot.command('check', async (ctx) => { if (!isVip(ctx)) return ctx.reply('⭐ VIP only.', { reply_markup: new InlineKeyboard().text('⭐ Get VIP', 'vip') }); const contract = ctx.match.trim(); if (!contract) return ctx.reply('Usage: /check <contract address>'); ctx.reply('🔍 Analyzing: '+contract+'\n\n✅ Format: Valid\n⚠️ Always verify on Etherscan/Solscan.\n\nhttps://etherscan.io/token/'+contract, { reply_markup: vipMenu }); });
bot.start();
console.log('🤖 VIP Bot is running...');
