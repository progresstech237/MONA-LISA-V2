const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API_V2 = 'https://api.omegatech.app/api/tools/tiktok-views-v2';
const API_V1 = 'https://api.omegatech.app/api/tools/tiktok-views';

function getThumb() { try { for (const p of ['./media/menu1.png','./media/menu2.png']) if (fs.existsSync(p)) return fs.readFileSync(p); } catch {} return null; }

cmd({
  pattern: "tiktokviews",
  alias: ["ttviews", "tikviews", "tiktoklikes", "ttlikes", "tklikes", "views"],
  react: "👁️",
  desc: "Send free TikTok likes/views - v1 & v2 with IP rotation + Cloudflare token - returns order ID",
  category: "progresstech tools",
  use: ".tiktokviews https://tiktok.com/... |.tiktokviews v2 <link> |.tiktokviews v1 <link>",
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

    const ctx = { forwardingScore: 999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: NEWSLETTER_JID, serverMessageId: 1, newsletterName: '🥷TECH TOY🧑‍💻™ ✓' } };

    // Detect version
    let version = 2; // default v2 is better (IP rotation)
    if (rawQ.toLowerCase().startsWith('v1') || rawQ.toLowerCase().includes(' v1 ')) { version = 1; rawQ = rawQ.replace(/v1/gi,'').trim(); }
    if (rawQ.toLowerCase().startsWith('v2') || rawQ.toLowerCase().includes(' v2 ')) { version = 2; rawQ = rawQ.replace(/v2/gi,'').trim(); }

    const urlMatch = rawQ.match(/https?:\/\/[^\s]+/);
    const tiktokUrl = urlMatch? urlMatch[0] : rawQ;

    if (!rawQ || ['help','menu'].includes(rawQ.toLowerCase()) ||!tiktokUrl.includes('tiktok')) {
        let thumb = null; try { const { prepareWAMessageMedia } = require('@whiskeysockets/baileys'); const tb = getThumb(); if (tb) { const media = await prepareWAMessageMedia({ image: tb }, { upload: conn.waUploadToServer }); thumb = media.imageMessage; } } catch {}
        const menu = `┏━━〔 👁️ TikTok Views 〕━━┓
┃ Free TikTok Likes / Views
┃ via OmegaTech
┃
┃ V2: IP rotation + Cloudflare
┃ Returns order ID + next time
┃ V1: Simple free likes
┃
┃ *Usage:*
┃ ${prefix}tiktokviews https://vm.tiktok.com/xxxx
┃ ${prefix}tiktokviews v2 https://tiktok.com/@user/video/123
┃ ${prefix}tiktokviews v1 https://tiktok.com/...
┃
┃ Just paste TikTok link
┗━━━━━━━━━━━━━━┛
`;
        const buttons = [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "👁️ V2 Best", id: `${prefix}tiktokviews v2 ` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "👁️ V1", id: `${prefix}tiktokviews v1 ` }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 Channel", url: CHANNEL_LINK }) }
        ];
        return await conn.relayMessage(from, {
            interactiveMessage: {
                header: { title: "👁️ TikTok Free Likes/Views", hasMediaAttachment:!!thumb,...(thumb? { imageMessage: thumb } : {}) },
                body: { text: menu }, footer: { text: BRAND }, nativeFlowMessage: { buttons }
            }, contextInfo: ctx
        }, {});
    }

    await conn.sendMessage(from, { react: { text: "👁️", key: mek.key } });

    const apiUrl = version === 2? API_V2 : API_V1;
    const methodName = version === 2? 'V2 - IP Rotation + CF Token' : 'V1 - Simple';

    reply(`*👁️ Sending TikTok Likes...*\n*Method:* ${methodName}\n*Link:* ${tiktokUrl.slice(0,60)}...\n\n_Wait 10-30 sec, bypassing with IP rotation..._\n\n_${BRAND}_`);

    let result = null;

    // Try POST with multiple param names
    try {
        const { data } = await axios.post(apiUrl, {
            url: tiktokUrl,
            link: tiktokUrl,
            video_url: tiktokUrl,
            videoUrl: tiktokUrl,
            tiktok_url: tiktokUrl,
            tiktokUrl: tiktokUrl
        }, { timeout: 60000, headers: { 'Content-Type': 'application/json' } });
        result = data.data || data;
    } catch (e) {
        console.log('TT POST fail', e.response?.data || e.message);
        try {
            const { data } = await axios.get(`${apiUrl}?url=${encodeURIComponent(tiktokUrl)}&link=${encodeURIComponent(tiktokUrl)}`, { timeout: 60000 });
            result = data.data || data;
        } catch {}
    }

    if (!result) throw new Error('No response from TikTok API');

    const orderId = result.order_id || result.orderId || result.id || result.data?.order_id || result.data?.orderId || 'N/A';
    const nextTime = result.next_available || result.nextAvailable || result.next_time || result.data?.next_available || result.data?.nextAvailable || result.wait || result.cooldown || 'Unknown';
    const status = result.status || result.message || result.data?.status || result.msg || 'Sent';

    let msg = `*✅ TikTok Likes Sent*\n*Method:* ${methodName}\n\n`;
    msg += `🔗 *Link:* ${tiktokUrl}\n`;
    msg += `🆔 *Order ID:* ${orderId}\n`;
    msg += `⏰ *Next Available:* ${nextTime}\n`;
    msg += `📊 *Status:* ${typeof status === 'string'? status.slice(0,500) : JSON.stringify(status).slice(0,500)}\n`;
    if (result.likes || result.views) msg += `👁️ *Count:* ${result.likes || result.views}\n`;
    if (result.data && typeof result.data === 'string') msg += `\n*Data:* ${result.data.slice(0,500)}\n`;
    msg += `\n*Full Response:*\n\`\`\`${JSON.stringify(result, null, 2).slice(0,2000)}\`\`\`\n\n*${BRAND}*`;

    await conn.sendMessage(from, { text: msg, contextInfo: ctx }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('TikTok Views Error:', e.response?.data || e.message);
    reply(`*❌ TikTok Views Failed*\n${e.response?.data?.message || e.message}\n\nCheck link: must be valid TikTok video URL\nExample: ${'.tiktokviews https://vm.tiktok.com/xxxxx'}`);
  }
});