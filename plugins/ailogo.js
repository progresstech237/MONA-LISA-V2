const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/ai/Ai-logo';

// ── Helper: Call API ──
async function fetchLogos({ action = 'generate', prompt = 'Progress Tech', limit = 5 }) {
    const params = { action, limit };
    if (action === 'generate') params.prompt = prompt;
    const { data } = await axios.get(API, { params, timeout: 30000 });
    // data = { statusCode:200, success:true, data:{ prompt, total, logos:[...] } }
    return data;
}

// ── MAIN COMMAND:.ailogo ──
cmd({
    pattern: "ailogo",
    alias: ["logoai", "genlogo", "logogen", "alogo"],
    react: "🎨",
    desc: "AI Logo Generator from Design.com (Omegatech) - /api/ai/Ai-logo",
    category: "ai",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        // 1. MENU WHEN NO ARGS - like you wanted for.argen
        if (!q) {
            const menu = `╭─ *🎨 AI LOGO HUB - LIVE ✅* ─
│ Endpoint: /api/ai/Ai-logo
│ Source: Design.com via Omegatech
│ Working: 🟢 200 OK
│
├─ *📌 COMMANDS*
│ •.ailogo <name> - Generate 5 logos
│ •.ailogo home - Popular logos
│ •.ailogo <name> --limit 10
│ •.ailogo <name> --action generate
│
├─ *🔥 EXAMPLES*
│.ailogo Progress Tech
│.ailogo StarLabs
│.ailogo gaming 3d logo --limit 8
│.ailogo Barber Shop
│.ailogo home --limit 5
│
├─ *⚙️ PARAMS*
│ action: generate = search by keyword
│ home = popular logos
│ prompt: Brand / Keyword (e.g. 'coffee', 'gaming')
│ limit: 1-10 (default 5)
│
╰─ Try:.ailogo Progress Tech`;

            return await conn.sendMessage(from, {
                image: { url: 'https://dynamic.design.com/template/preview/design/6792619e-c3fc-4d41-bb37-73ca3a6b5597/74c1dea3-1050-4110-838e-51b601889f3c?v=4&text=AI+LOGO&size=design-preview-standalone-2x' },
                caption: menu
            }, { quoted: mek });
        }

        // 2. PARSE FLAGS
        let limit = 5;
        let action = 'generate';
        let prompt = q.trim();

        const limitMatch = q.match(/--limit\s+(\d+)/i);
        if (limitMatch) {
            limit = Math.min(10, Math.max(1, parseInt(limitMatch[1]) || 5));
            prompt = prompt.replace(/--limit\s+\d+/i, '').trim();
        }

        const actionMatch = q.match(/--action\s+(generate|home)/i);
        if (actionMatch) {
            action = actionMatch[1].toLowerCase();
            prompt = prompt.replace(/--action\s+\w+/i, '').trim();
        }

        // If user types "home" as prompt
        if (prompt.toLowerCase() === 'home' || prompt.toLowerCase() === 'popular') {
            action = 'home';
            prompt = '';
        }

        if (action === 'generate' &&!prompt) prompt = 'Progress Tech';

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // 3. CALL LIVE API
        const res = await fetchLogos({ action, prompt: prompt || 'Progress Tech', limit });
        const logos = res?.data?.logos || res?.logos || [];
        const total = res?.data?.total || logos.length;

        if (!logos.length) {
            return reply(`❌ No logos found.\nResponse: ${JSON.stringify(res).slice(0, 500)}`);
        }

        await conn.sendMessage(from, { text: `*🎨 Found ${total} logos for:* ${action === 'home'? 'Popular' : prompt}\n_Sending ${logos.length} HD designs..._` }, { quoted: mek });

        // 4. SEND ALL LOGOS AS INDIVIDUAL HD IMAGES
        for (let i = 0; i < logos.length; i++) {
            const lg = logos[i];
            const caption = `*${i + 1}/${logos.length} • ${lg.designName || 'Logo Design'}*\n` +
                `*Brand:* ${prompt || 'Popular'}\n` +
                `*Type:* ${lg.templateType || lg.templateCategory || 'Logo'}\n` +
                `*Free:* ${lg.isFree? 'Yes ✅' : 'Pro 🔒'}\n` +
                `*Token:* ${lg.logoToken?.slice(0, 8)}...\n\n` +
                `*HD Link:*\n${lg.imageUrl}\n\n` +
                `> _Type.ailogo ${prompt || 'StarLabs'} for more_`;

            try {
                await conn.sendMessage(from, {
                    image: { url: lg.imageUrl },
                    caption: caption
                }, { quoted: mek });
            } catch (err) {
                // Fallback if image fetch fails - send link
                await conn.sendMessage(from, { text: caption }, { quoted: mek });
            }
            // Small delay to avoid spam block
            await new Promise(r => setTimeout(r, 700));
        }

        // 5. FINAL FOOTER
        await conn.sendMessage(from, {
            text: `✅ *Done! ${logos.length} logos for "${prompt || 'Popular'}"*\n\nWant more?\n•.ailogo ${prompt || 'Progress Tech'} --limit 10\n•.ailogo home\n•.ailogo ${prompt || 'Progress Tech'} --action generate`
        }, { quoted: mek });

    } catch (e) {
        console.error('Ai-logo plugin error:', e.response?.data || e.message);
        return reply(`❌ *Ai-logo Failed*\n${e.response?.data?.message || e.message}\n\n*Try:*\n.ailogo Progress Tech\n.ailogo home`);
    }
});
