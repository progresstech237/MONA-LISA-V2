const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';

const APIKEY = 'dc_live_PVxGPDbjSTMy8_-_m9rxiBVbx7JSYkD1';
const API = 'https://apis.davidcyril.name.ng/fun/couple-pp';
const LIMIT_FILE = path.join(__dirname, '../data/couple_limit.json');
const CACHE_FILE = path.join(__dirname, '../data/couple_cache.json');

function getLimits() {
  try {
    if (!fs.existsSync(LIMIT_FILE)) return { day: {}, month: 0, monthStamp: new Date().getMonth() };
    return JSON.parse(fs.readFileSync(LIMIT_FILE));
  } catch { return { day: {}, month: 0, monthStamp: new Date().getMonth() }; }
}
function saveLimits(d) {
  if (!fs.existsSync(path.dirname(LIMIT_FILE))) fs.mkdirSync(path.dirname(LIMIT_FILE), {recursive:true});
  fs.writeFileSync(LIMIT_FILE, JSON.stringify(d));
}
function getCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE)); } catch { return null; }
}
function saveCache(male, female) {
  if (!fs.existsSync(path.dirname(CACHE_FILE))) fs.mkdirSync(path.dirname(CACHE_FILE), {recursive:true});
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ male, female, time: Date.now() }));
}

cmd({
  pattern: "coupledp",
  alias: ["couple","couplepfp","cdp"],
  react: "💑",
  desc: "Couple DP with Limit (3/day)",
  category: "fun",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    const ctx = {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: NEWSLETTER_JID,
        serverMessageId: 142,
        newsletterName: '🥷TECH TOY🧑‍💻™ ✓'
      }
    };

    if (APIKEY === 'dc_live_PVxGPDbjSTMy8_-_m9rxiBVbx7JSYkD1') {
      return await conn.sendMessage(from, { text: `❌ Set APIKEY in coupledp.js first\nGet: https://apis.davidcyril.name.ng`, contextInfo: ctx }, { quoted: mek });
    }

    // --- LIMIT CHECK ---
    const today = new Date().toDateString();
    const currMonth = new Date().getMonth();
    let limits = getLimits();

    // Reset month if changed
    if (limits.monthStamp!== currMonth) { limits.month = 0; limits.monthStamp = currMonth; }
    if (!limits.day[today]) limits.day[today] = 0;

    const DAILY_LIMIT = 3; // Free: 3/day
    const MONTHLY_LIMIT = 3; // Free: 3/month

    if (limits.month >= MONTHLY_LIMIT) {
      const cache = getCache();
      if (cache) {
        await conn.sendMessage(from, { text: `⚠️ *Monthly Limit Reached (3/month)*\nShowing cached couple DP from last fetch.`, contextInfo: ctx }, { quoted: mek });
        await conn.sendMessage(from, { image: { url: cache.male }, caption: `*💙 Male (Cached)*\n\n_${BRAND}_`, contextInfo: ctx }, { quoted: mek });
        return await conn.sendMessage(from, { image: { url: cache.female }, caption: `*❤️ Female (Cached)*\n\n_${BRAND}_`, contextInfo: ctx }, { quoted: mek });
      } else return reply(`❌ *Monthly limit (3/month) reached.* No cache yet. Wait next month.`);
    }

    if (limits.day[today] >= DAILY_LIMIT) {
      const cache = getCache();
      if (cache) {
        await conn.sendMessage(from, { text: `⚠️ *Daily Limit Reached (3/day)*\nShowing cached result. Resets tomorrow.`, contextInfo: ctx }, { quoted: mek });
        await conn.sendMessage(from, { image: { url: cache.male }, caption: `*💙 Male (Cached)*`, contextInfo: ctx }, { quoted: mek });
        return await conn.sendMessage(from, { image: { url: cache.female }, caption: `*❤️ Female (Cached)*`, contextInfo: ctx }, { quoted: mek });
      } else return reply(`❌ *Daily limit (3/day) reached.* Try tomorrow.`);
    }

    await conn.sendMessage(from, { react: { text: "💑", key: mek.key } });

    let data = null;
    const tries = [
      `${API}?apikey=${APIKEY}`,
      `https://apis.davidcyril.name.ng/fun/couple?apikey=${APIKEY}`,
      `https://apis.davidcyril.name.ng/fun/couple-pp?apikey=${APIKEY}`
    ];
    for (let url of tries) {
      try { const res = await axios.get(url, { timeout: 20000 }); if (res.data?.male) { data = res.data; break; } } catch {}
    }
    if (!data) return reply(`❌ API failed. Check key.`);

    // SUCCESS -> Increase counters
    limits.day[today] += 1;
    limits.month += 1;
    saveLimits(limits);
    saveCache(data.male, data.female);

    const leftDay = DAILY_LIMIT - limits.day[today];
    const leftMonth = MONTHLY_LIMIT - limits.month;

    await conn.sendMessage(from, { image: { url: data.male }, caption: `*💙 Male DP*\nLeft Today: ${leftDay}/3 | Left Month: ${leftMonth}/3\n\n_${BRAND}_`, contextInfo: ctx }, { quoted: mek });
    await conn.sendMessage(from, { image: { url: data.female }, caption: `*❤️ Female DP*\nLeft Today: ${leftDay}/3 | Left Month: ${leftMonth}/3\n\n_${BRAND}_`, contextInfo: ctx }, { quoted: mek });

  } catch (e) {
    reply(`❌ Error: ${e.message}`);
  }
});