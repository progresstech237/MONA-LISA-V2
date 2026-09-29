// ═══════════════════════════════════════════════════════════════════════════
//   🧠 AI & CREATIVE STUDIO COMMANDS — MONA LISA
//   Powered by Progress Tech
// ═══════════════════════════════════════════════════════════════════════════

const { cmd } = require('../redx');
const { success, error, loading } = require('../lib/responses');
const aiProvider = require('../providers/ai');
const videoProvider = require('../providers/video');
const pollinations = require('../providers/pollinations');

// ─── AI Chat ───
cmd({
    pattern: "ai",
    alias: ["gpt", "ask", "assistant"],
    desc: "Chat with the MONA LISA AI assistant",
    category: "ai",
    react: "🧠",
    filename: __filename,
}, async (conn, mek, m, { reply, q }) => {
    if (!q) return reply("💬 *Usage:* .ai <your question>\n\nExample: .ai explain quantum computing simply");

    if (!aiProvider.isConfigured()) {
        return reply(error(aiProvider.configHint()));
    }

    try {
        await reply(loading("Thinking of the perfect words..."));
        const answer = await aiProvider.chat(q);
        await reply(success(answer));
    } catch (e) {
        await reply(error(e.notConfigured ? e.message : `The AI provider had trouble: ${e.message}`));
    }
});

// ─── AI Video Generation ───
cmd({
    pattern: "genvideo",
    alias: ["makevideo", "vgen"],
    desc: "Generate a short video from a text description",
    category: "video",
    react: "🎬",
    filename: __filename,
}, async (conn, mek, m, { reply, q }) => {
    if (!q) return reply("🎬 *Usage:* .genvideo <description>\n\nExample: .genvideo a bird flying over a mountain at sunset");

    if (!videoProvider.isT2VConfigured()) {
        return reply(error(videoProvider.t2vConfigHint()));
    }

    try {
        await reply(loading("This can take a minute — painting frame by frame..."));
        const videoUrl = await videoProvider.generateFromText(q);
        await conn.sendMessage(m.chat, {
            video: { url: videoUrl },
            caption: success(`Here's your video: "${q}"`),
        }, { quoted: mek });
    } catch (e) {
        await reply(error(e.notConfigured ? e.message : `The video provider had trouble: ${e.message}`));
    }
});

// ─── Image-to-Video ───
cmd({
    pattern: "img2video",
    alias: ["animateimage"],
    desc: "Animate a quoted/replied image into a short video",
    category: "video",
    react: "🎥",
    filename: __filename,
}, async (conn, mek, m, { reply, q }) => {
    if (!m.quoted || m.quoted.mtype !== 'imageMessage') {
        return reply("🎥 *Usage:* Reply to an image with .img2video <optional motion description>");
    }

    if (!videoProvider.isI2VConfigured()) {
        return reply(error(videoProvider.i2vConfigHint()));
    }

    try {
        await reply(loading("Breathing motion into the still image..."));
        const buffer = await m.quoted.download();
        // Providers expect a URL, not raw bytes — the admin's provider setup
        // must accept a base64 data URL or the bot needs a place to host the
        // temp image. We use a data URL here since it works with most
        // Replicate-hosted models without extra infrastructure.
        const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        const videoUrl = await videoProvider.generateFromImage(dataUrl, q || 'animate this image naturally');
        await conn.sendMessage(m.chat, {
            video: { url: videoUrl },
            caption: success('Your image has come to life.'),
        }, { quoted: mek });
    } catch (e) {
        await reply(error(e.notConfigured ? e.message : `The video provider had trouble: ${e.message}`));
    }
});

// ─── Talking Avatar (image + exact script → person actually saying it) ───
cmd({
    pattern: "talkingavatar",
    alias: ["avatarspeak", "makeavatarsay"],
    desc: "Reply to a portrait photo to make that person say your exact words",
    category: "video",
    react: "🗣️",
    filename: __filename,
}, async (conn, mek, m, { reply, q }) => {
    if (!m.quoted || m.quoted.mtype !== 'imageMessage') {
        return reply("🗣️ *Usage:* Reply to a clear, front-facing portrait photo with .talkingavatar <exact words to say>\n\nExample: .talkingavatar I love MONA LISA Mini, it's the best assistant ever.");
    }
    if (!q) {
        return reply("🗣️ Tell me what they should say — reply to the photo with .talkingavatar <exact words>");
    }

    if (!videoProvider.isAvatarConfigured()) {
        return reply(error(videoProvider.avatarConfigHint()));
    }

    try {
        await reply(loading("Teaching the portrait to speak your words..."));
        const buffer = await m.quoted.download();
        const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        const videoUrl = await videoProvider.generateAvatar(dataUrl, q);
        await conn.sendMessage(m.chat, {
            video: { url: videoUrl },
            caption: success('Listen closely.'),
        }, { quoted: mek });
    } catch (e) {
        await reply(error(e.notConfigured ? e.message : `The avatar provider had trouble: ${e.message}`));
    }
});

// ─── Free image generation (Pollinations.ai — genuinely free, no key needed) ───
cmd({
    pattern: "freeimagine",
    alias: ["freenano", "draw"],
    desc: "Generate an image for free, no API key needed (Pollinations.ai)",
    category: "image",
    react: "🌸",
    filename: __filename,
}, async (conn, mek, m, { reply, q }) => {
    if (!q) return reply("🌸 *Usage:* .freeimagine <description>\n\nCompletely free, no API key required. For higher-quality results, .imagine (Stability AI) needs a paid key — this doesn't need anything.");
    try {
        await reply(loading("Growing your image..."));
        const buf = await pollinations.generate(q);
        await conn.sendMessage(m.chat, { image: buf, caption: success(`"${q}" — via Pollinations.ai (free)`) }, { quoted: mek });
    } catch (e) {
        await reply(error(`Free image generation had trouble: ${e.message}`));
    }
});

// ─── Translate (works standalone, no external AI needed) ───
cmd({
    pattern: "translate",
    alias: ["tr"],
    desc: "Translate text using the configured AI provider",
    category: "ai",
    react: "🌐",
    filename: __filename,
}, async (conn, mek, m, { reply, q }) => {
    if (!q || !q.includes('|')) {
        return reply("🌐 *Usage:* .translate <language>|<text>\n\nExample: .translate french|good morning");
    }
    if (!aiProvider.isConfigured()) return reply(error(aiProvider.configHint()));

    const [lang, ...rest] = q.split('|');
    const text = rest.join('|').trim();
    try {
        await reply(loading("Finding the right words..."));
        const result = await aiProvider.chat(`Translate the following text to ${lang.trim()}. Only reply with the translation, nothing else:\n\n${text}`);
        await reply(success(result));
    } catch (e) {
        await reply(error(e.notConfigured ? e.message : `Translation failed: ${e.message}`));
    }
});

// ─── Summarize ───
cmd({
    pattern: "summarize",
    alias: ["summary", "tldr"],
    desc: "Summarize a block of text using the configured AI provider",
    category: "ai",
    react: "📝",
    filename: __filename,
}, async (conn, mek, m, { reply, q }) => {
    if (!q) return reply("📝 *Usage:* .summarize <text>");
    if (!aiProvider.isConfigured()) return reply(error(aiProvider.configHint()));

    try {
        await reply(loading("Distilling the essentials..."));
        const result = await aiProvider.chat(`Summarize the following text in 3-4 concise sentences:\n\n${q}`);
        await reply(success(result));
    } catch (e) {
        await reply(error(e.notConfigured ? e.message : `Summarizing failed: ${e.message}`));
    }
});

// ─── Coding assistant ───
cmd({
    pattern: "code",
    alias: ["coder", "codehelp"],
    desc: "Get coding help from the configured AI provider",
    category: "ai",
    react: "💻",
    filename: __filename,
}, async (conn, mek, m, { reply, q }) => {
    if (!q) return reply("💻 *Usage:* .code <your coding question>");
    if (!aiProvider.isConfigured()) return reply(error(aiProvider.configHint()));

    try {
        await reply(loading("Compiling thoughts..."));
        const result = await aiProvider.chat(`You are a precise coding assistant. Answer this clearly, with code blocks where useful:\n\n${q}`);
        await reply(success(result));
    } catch (e) {
        await reply(error(e.notConfigured ? e.message : `Coding help failed: ${e.message}`));
    }
});
