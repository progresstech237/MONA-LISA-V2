const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7Lk3yAzNbrVaWDOk1P';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://api.omegatech.app/api/ai/Sora';
const TOKEN_FILE = './data/sora-tokens.json';

if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
function loadTokens() { try { if (fs.existsSync(TOKEN_FILE)) return JSON.parse(fs.readFileSync(TOKEN_FILE,'utf8')); } catch {} return {}; }
function saveTokens(t) { try { fs.writeFileSync(TOKEN_FILE, JSON.stringify(t, null, 2)); } catch {} }

let tokens = loadTokens();

function getThumb() {
    try {
        for (const p of ['./media/menu1.png','./media/menu2.png']) {
            if (fs.existsSync(p)) return fs.readFileSync(p);
        }
        return null;
    } catch { return null; }
}

cmd({
  pattern: "sora2",
  alias: ["soraai", "soravideo", "opensora"],
  react: "🎥",
  desc: "Generate AI videos with Sora.ai - polling, token reuse",
  category: "progresstech ai",
  use: ".sora2 a cat astronaut in space |.sora token <token> extend it |.sora2 mytokens",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    let rawQ = q || "";
    const inter = mek.message?.interactiveResponseMessage;
    if (inter?.nativeFlowResponseMessage?.paramsJson) {
        try {
            const p = JSON.parse(inter.nativeFlowResponseMessage.paramsJson);
            if (p.id) rawQ = p.id.replace(prefix,"").trim();
        } catch {}
    }
    if (mek.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        rawQ = mek.message.listResponseMessage.singleSelectReply.selectedRowId.replace(prefix,"").trim();
    }
    if (rawQ.startsWith(prefix)) rawQ = rawQ.replace(new RegExp(`^${prefix}[a-z-]+\\s*`, 'i'), '').trim();

    const ctx = {
        forwardingScore: 999, isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: NEWSLETTER_JID,
            serverMessageId: 1,
            newsletterName: '🥷TECH TOY🧑‍💻™ ✓'
        }
    };

    const userKey = m.sender;

    if (rawQ.toLowerCase() === 'mytokens' || rawQ.toLowerCase() === 'tokens' || rawQ.toLowerCase() === 'history') {
        const userTokens = tokens[userKey] || [];
        if (userTokens.length === 0) return reply(`*No Sora tokens yet*\nGenerate with: ${prefix}sora a cat dancing\n\n${BRAND}`);
        let list = userTokens.map((t,i)=> `${i+1}. Token: \`${t.token.slice(0,30)}...\`\n Prompt: ${t.prompt.slice(0,60)}`).join('\n\n');
        return reply(`*🎥 Your Sora Tokens:*\n\n${list}\n\nUse: ${prefix}sora token <token> continue the video\n\n${BRAND}`);
    }

    if (rawQ.toLowerCase().startsWith('token ')) {
        const parts = rawQ.slice(5).trim().split(' ');
        const token = parts[0];
        const newPrompt = parts.slice(1).join(' ') || 'continue';

        rawQ = newPrompt;
        // will add token to payload below
        q = newPrompt;
        // store token for reuse
        if (!tokens[userKey]) tokens[userKey] = [];
        // we will handle in polling logic
        rawQ = `${newPrompt} [REUSE_TOKEN:${token}]`;
    }

    if (!rawQ || rawQ.toLowerCase() === 'help' || rawQ.toLowerCase() === 'menu') {
        let thumb = null;
        try {
            const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
            const tb = getThumb();
            if (tb) {
                const media = await prepareWAMessageMedia({ image: tb }, { upload: conn.waUploadToServer });
                thumb = media.imageMessage;
            }
        } catch {}

        const menu = `┏━━〔 🎥 Sora.ai 〕━━┓
┃ OpenAI Sora - Premium Video
┃ Generates, polls till complete
┃ Token reuse for continuation
┃
┃ *Usage:*
┃ ${prefix}sora2 a cat astronaut dancing in space
┃ ${prefix}sora2 9:16 Mona Lisa afro girl singing
┃ ${prefix}sora2 token <token> make it sunset now
┃ ${prefix}sora2 mytokens - view your tokens
┃
┃ *Tips:*
┃ • Be descriptive (cinematic, 4k)
┃ • Takes 60-120 sec (polling)
┃ • Token auto-saved for reuse
┗━━━━━━━━━━━━━━┛
`;

        const buttons = [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎬 Generate", id: `${prefix}sora2 cinematic shot of Mona Lisa afro girl singing in Paris at sunset, omah lay vibe, 4k` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🌃 City Sunset", id: `${prefix}sora futuristic city skyline at sunset, drones flying, cinematic, 4k` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📜 My Tokens", id: `${prefix}sora mytokens` }) },
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 TECH TOY Channel", url: CHANNEL_LINK }) }
        ];

        return await conn.relayMessage(from, {
            interactiveMessage: {
                header: { title: "🎥 Sora.ai • OpenAI", hasMediaAttachment:!!thumb,...(thumb? { imageMessage: thumb } : {}) },
                body: { text: menu },
                footer: { text: BRAND },
                nativeFlowMessage: { buttons }
            },
            contextInfo: ctx
        }, {});
    }

    await conn.sendMessage(from, { react: { text: "🎥", key: mek.key } });

    let actualPrompt = rawQ;
    let reuseToken = null;

    // Extract reuse token if present
    const tokenMatch = rawQ.match(/\[REUSE_TOKEN:([^\]]+)\]/);
    if (tokenMatch) {
        reuseToken = tokenMatch[1];
        actualPrompt = rawQ.replace(tokenMatch[0], '').trim();
    }

    let aspectRatio = "16:9";
    const arMatch = actualPrompt.match(/(16:9|9:16|1:1|4:3|21:9)/i);
    if (arMatch) {
        aspectRatio = arMatch[1];
        actualPrompt = actualPrompt.replace(arMatch[1], '').trim();
    }

    reply(`*🎥 Sora.ai Generating...*\n*Prompt:* ${actualPrompt.slice(0,120)}\n*Ratio:* ${aspectRatio}\n*Token:* ${reuseToken? 'Reusing' : 'New'}\n\n_This uses Sora.ai and polls until complete (60-180 sec)..._\n_Please wait, don't spam_\n\n_${BRAND}_`);

    // Initial request
    let payload = {
        prompt: actualPrompt,
        text: actualPrompt,
        query: actualPrompt,
        aspect_ratio: aspectRatio,
        aspectRatio: aspectRatio,
        ratio: aspectRatio,
        token: reuseToken,
        reuse_token: reuseToken,
        previous_token: reuseToken
    };

    let responseData = null;
    let videoUrl = null;
    let returnedToken = null;
    let attempts = 0;
    const maxAttempts = 30; // Poll up to 30 times ( ~5 mins)

    // First call
    try {
        const { data } = await axios.post(API, payload, {
            timeout: 120000,
            headers: { 'Content-Type': 'application/json' }
        });
        responseData = data;
        videoUrl = data.data?.url || data.data?.video_url || data.data?.videoUrl || data.url || data.video_url || data.data?.link || data.data?.result || data.result;
        returnedToken = data.data?.token || data.token || data.data?.sora_token || data.sora_token;
        if (!videoUrl && typeof data.data === 'string' && data.data.startsWith('http')) videoUrl = data.data;
        if (!videoUrl && data.data?.status === 'processing' && returnedToken) {
            // Need to poll
            console.log('Sora processing, token:', returnedToken);
        }
    } catch (e) {
        console.log('Sora POST error', e.response?.data || e.message);
        // Try GET
        try {
            const { data } = await axios.get(`${API}?prompt=${encodeURIComponent(actualPrompt)}&aspect_ratio=${aspectRatio}${reuseToken? `&token=${reuseToken}` : ''}`, { timeout: 120000 });
            responseData = data;
            videoUrl = data.data?.url || data.url || data.data?.video_url;
            returnedToken = data.data?.token || data.token;
            if (!videoUrl && typeof data.data === 'string' && data.data.startsWith('http')) videoUrl = data.data;
        } catch {}
    }

    // Polling loop if no video yet but token returned
    if (!videoUrl && returnedToken) {
        reply(`*⏳ Sora is processing...*\nToken: \`${returnedToken.slice(0,40)}...\`\nPolling every 10 sec...`);

        while (attempts < maxAttempts &&!videoUrl) {
            attempts++;
            await new Promise(r => setTimeout(r, 10000)); // 10 sec wait

            try {
                const { data } = await axios.post(API, {
                    token: returnedToken,
                    action: "poll",
                    status: "check",
                    prompt: actualPrompt
                }, { timeout: 30000, headers: { 'Content-Type': 'application/json' } });

                videoUrl = data.data?.url || data.data?.video_url || data.url || data.video_url || data.data?.result;
                if (!videoUrl && typeof data.data === 'string' && data.data.startsWith('http')) videoUrl = data.data;

                if (videoUrl) break;

                // Also try GET poll
                const { data: getData } = await axios.get(`${API}?token=${returnedToken}&action=poll`, { timeout: 30000 }).catch(()=> ({ data: {} }));
                if (getData.data?.url || getData.url) {
                    videoUrl = getData.data?.url || getData.url;
                    break;
                }

                if (attempts % 3 === 0) {
                    await conn.sendMessage(from, { text: `*⏳ Still generating...* (${attempts*10}s)\nToken: \`${returnedToken.slice(0,20)}...\`\n\n_${BRAND}_` }, { quoted: mek });
                }

            } catch (e) {
                console.log(`Poll attempt ${attempts} failed`, e.message);
            }
        }
    }

    if (!videoUrl) {
        throw new Error(`Sora still processing after ${attempts*10}s. Your token: ${returnedToken || 'not returned'}. Use ${prefix}sora token ${returnedToken} to check later.`);
    }

    // Save token
    if (!tokens[userKey]) tokens[userKey] = [];
    tokens[userKey].push({ token: returnedToken || videoUrl, prompt: actualPrompt, url: videoUrl, time: Date.now() });
    if (tokens[userKey].length > 10) tokens[userKey] = tokens[userKey].slice(-10);
    saveTokens(tokens);

    await conn.sendMessage(from, {
        video: { url: videoUrl },
        caption: `*✅ Sora Video Generated*\n*Prompt:* ${actualPrompt}\n*Ratio:* ${aspectRatio}\n*Token:* \`${(returnedToken || 'n/a').slice(0,50)}\`\n\n_Save this token to continue video:_\n${prefix}sora token ${returnedToken || '[token]'} extend scene\n\n*${BRAND}*\n${CHANNEL_LINK}`,
        contextInfo: ctx
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error('Sora Error:', e.response?.data || e.message);
    reply(`*❌ Sora Failed*\n${e.response?.data?.message || e.message}\n\n*Tip:* If token returned, use:\n${'.sora token <token> to continue'}`);
  }
});