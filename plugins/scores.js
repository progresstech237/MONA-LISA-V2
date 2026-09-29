const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://api.omegatech.app/api/tools/scores';

function getThumb() {
    try { for (const p of ['./media/menu1.png','./media/menu2.png']) if (fs.existsSync(p)) return fs.readFileSync(p); } catch {} return null;
}

function formatMatch(m) {
    try {
        const home = m.home_team || m.homeTeam || m.home || m.team1 || m.localteam?.name || 'Home';
        const away = m.away_team || m.awayTeam || m.away || m.team2 || m.visitorteam?.name || 'Away';
        const homeScore = m.home_score ?? m.homeScore ?? m.score1 ?? m.goals_home ?? m.localteam?.goals ?? '-';
        const awayScore = m.away_score ?? m.awayScore ?? m.score2 ?? m.goals_away ?? m.visitorteam?.goals ?? '-';
        const status = m.status || m.match_status || m.state || 'LIVE';
        const minute = m.minute || m.time || m.live_minute || '';
        const league = m.league || m.competition || m.tournament?.name || m.league_name || '';
        const timeStr = minute? `${minute}'` : status;

        let icon = '⚽';
        if (String(status).toLowerCase().includes('live') || minute) icon = '🔴 LIVE';
        if (String(status).toLowerCase().includes('ft') || String(status).toLowerCase().includes('finished')) icon = '✅ FT';
        if (String(status).toLowerCase().includes('ht')) icon = '⏸️ HT';

        return `${icon} *${home} ${homeScore} - ${awayScore} ${away}*\n   🏆 ${league} | ⏱️ ${timeStr}${m.goals? `\n   ⚽ Goals: ${m.goals}` : ''}`;
    } catch { return JSON.stringify(m).slice(0,200); }
}

cmd({
  pattern: "scores",
  alias: ["livescore", "livescores", "football", "score", "match", "matches"],
  react: "⚽",
  desc: "Live football scores via OmegaTech Tools",
  category: "progresstech tools",
  use: ".scores |.scores live |.scores premier league",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    let rawQ = (q || "").trim();
    const inter = mek.message?.interactiveResponseMessage;
    if (inter?.nativeFlowResponseMessage?.paramsJson) {
        try { const p = JSON.parse(inter.nativeFlowResponseMessage.paramsJson); if (p.id) rawQ = p.id.replace(prefix,"").trim(); } catch {}
    }
    if (mek.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        rawQ = mek.message.listResponseMessage.singleSelectReply.selectedRowId.replace(prefix,"").trim();
    }
    if (rawQ.startsWith(prefix)) rawQ = rawQ.replace(new RegExp(`^${prefix}[a-z0-9-]+\\s*`, 'i'), '').trim();

    const ctx = {
        forwardingScore: 999, isForwarded: true,
        forwardedNewsletterMessageInfo: { newsletterJid: NEWSLETTER_JID, serverMessageId: 1, newsletterName: '🥷TECH TOY🧑‍💻™ ✓' }
    };

    if (!rawQ || ['help','menu','all','today'].includes(rawQ.toLowerCase())) rawQ = "live";

    await conn.sendMessage(from, { react: { text: "⚽", key: mek.key } });

    if (rawQ.toLowerCase() === 'help') {
        let thumb = null; try { const { prepareWAMessageMedia } = require('@whiskeysockets/baileys'); const tb = getThumb(); if (tb) { const media = await prepareWAMessageMedia({ image: tb }, { upload: conn.waUploadToServer }); thumb = media.imageMessage; } } catch {}
        const menu = `┏━━〔 ⚽ Live Scores 〕━━┓
┃ Real-time football scores
┃ via /api/tools/scores
┃
┃ *Usage:*
┃ ${prefix}scores - live today
┃ ${prefix}scores live - only live
┃ ${prefix}scores premier league
┃ ${prefix}scores barcelona
┃ ${prefix}scores la liga
┃ ${prefix}scores epl
┗━━━━━━━━━━━━━━┛
`;
        const buttons = [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🔴 LIVE Now", id: `${prefix}scores live` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🏆 EPL", id: `${prefix}scores premier league` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🇪🇸 La Liga", id: `${prefix}scores la liga` }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 Channel", url: CHANNEL_LINK }) }
        ];
        return await conn.relayMessage(from, {
            interactiveMessage: {
                header: { title: "⚽ Live Scores • OmegaTech", hasMediaAttachment:!!thumb,...(thumb? { imageMessage: thumb } : {}) },
                body: { text: menu }, footer: { text: BRAND }, nativeFlowMessage: { buttons }
            }, contextInfo: ctx
        }, {});
    }

    let dataResult = null;
    const query = rawQ;

    // Try POST first
    try {
        const { data } = await axios.post(API, {
            query: query,
            q: query,
            search: query,
            league: query,
            team: query,
            filter: query,
            text: query,
            prompt: query
        }, { timeout: 30000, headers: { 'Content-Type': 'application/json' } });
        dataResult = data.data || data.result || data;
    } catch (e) {
        console.log('scores POST fail', e.message);
    }

    // GET fallback - most tools use GET
    if (!dataResult) {
        try {
            const { data } = await axios.get(`${API}?q=${encodeURIComponent(query)}&query=${encodeURIComponent(query)}&search=${encodeURIComponent(query)}&league=${encodeURIComponent(query)}&live=true`, { timeout: 30000 });
            dataResult = data.data || data.result || data;
        } catch (e) { console.log('scores GET fail', e.message); }
    }

    // Bare GET
    if (!dataResult) {
        try {
            const { data } = await axios.get(API, { timeout: 30000 });
            dataResult = data.data || data.result || data;
        } catch {}
    }

    if (!dataResult) throw new Error('No scores returned from API');

    let matches = [];
    if (Array.isArray(dataResult)) matches = dataResult;
    else if (Array.isArray(dataResult.matches)) matches = dataResult.matches;
    else if (Array.isArray(dataResult.data)) matches = dataResult.data;
    else if (Array.isArray(dataResult.scores)) matches = dataResult.scores;
    else if (Array.isArray(dataResult.live)) matches = dataResult.live;
    else if (dataResult.matches) matches = [dataResult.matches];
    else matches = [dataResult];

    // Filter if query is not just "live"
    if (query.toLowerCase() !== 'live' && query.toLowerCase() !== 'today' && query.toLowerCase() !== 'all') {
        const qlow = query.toLowerCase();
        const filtered = matches.filter(mm => {
            const str = JSON.stringify(mm).toLowerCase();
            return str.includes(qlow);
        });
        if (filtered.length > 0) matches = filtered;
    }

    if (matches.length === 0) {
        return reply(`*⚽ No matches found for:* ${query}\n\nTry:\n${prefix}scores live\n${prefix}scores premier league\n\n${BRAND}`);
    }

    // Limit 20 matches to avoid spam
    const limited = matches.slice(0, 20);
    let msg = `*⚽ Live Football Scores*\n*Query:* ${query} | Found: ${matches.length}\n\n`;
    msg += limited.map(formatMatch).join('\n\n');
    if (matches.length > 20) msg += `\n\n_... and ${matches.length-20} more matches_`;
    msg += `\n\n_${BRAND}_\n${CHANNEL_LINK}\n_Updated: ${new Date().toLocaleTimeString()}_`;

    await conn.sendMessage(from, { text: msg, contextInfo: ctx }, { quoted: mek });

    // If more than 20, send file
    if (matches.length > 20) {
        const fullTxt = matches.map((mm,i)=> `${i+1}. ${formatMatch(mm)}`).join('\n\n');
        await conn.sendMessage(from, {
            document: Buffer.from(`LIVE SCORES - Query: ${query}\nFound: ${matches.length}\nTime: ${new Date().toLocaleString()}\n\n${fullTxt}\n\n${BRAND}`),
            mimetype: 'text/plain',
            fileName: `Scores_${query.replace(/\s+/g,'_')}_${Date.now()}.txt`,
            caption: `*📄 Full ${matches.length} matches*\n${BRAND}`,
            contextInfo: ctx
        }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('Scores Error:', e.response?.data || e.message);
    reply(`*❌ Scores Failed*\n${e.message}\n\nTry ${'.scores live'}`);
  }
});