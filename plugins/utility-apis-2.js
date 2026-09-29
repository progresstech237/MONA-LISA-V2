// ═══════════════════════════════════════════════════════════════════════════
//   🔧 UTILITY APIs II — MONA LISA
//   Powered by Progress Tech
//   Real free public APIs (no keys) + local generation. Same standard as
//   utility-apis.js — nothing here is faked or unverified.
// ═══════════════════════════════════════════════════════════════════════════

const { cmd } = require('../redx');
const axios = require('axios');
const QRCode = require('qrcode');
const { success, error } = require('../lib/responses');

const get = (url, opts = {}) => axios.get(url, { timeout: 15000, ...opts }).then(r => r.data);

// ── QR code (fully local generation, no API) ──
cmd({ pattern: "qr", desc: "Generate a QR code from text or a link", category: "tools", react: "🔳", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🔳 *Usage:* .qr <text or link>");
        try {
            const buffer = await QRCode.toBuffer(q, { width: 512, margin: 2 });
            await conn.sendMessage(m.chat, { image: buffer, caption: success(`QR code for: "${q}"`) }, { quoted: mek });
        } catch (e) {
            reply(error('Could not generate that QR code.'));
        }
    });

// ── URL shortener (TinyURL's free, no-key API) ──
cmd({ pattern: "urlshort", alias: ["short"], desc: "Shorten a URL", category: "tools", react: "🔗", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🔗 *Usage:* .urlshort <url>");
        if (!/^https?:\/\//i.test(q)) return reply(error('Please include http:// or https:// in the URL.'));
        try {
            const short = await get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`);
            reply(success(`🔗 ${short}`));
        } catch (e) {
            reply(error('Could not shorten that URL.'));
        }
    });

// ── Coffee (coffee.alexflipnote.dev — real, free, well-known image API) ──
cmd({ pattern: "coffee", desc: "Get a random cup-of-coffee photo", category: "fun", react: "☕", filename: __filename },
    async (conn, mek, m, { reply }) => {
        try {
            const data = await get('https://coffee.alexflipnote.dev/random.json');
            await conn.sendMessage(m.chat, { image: { url: data.file }, caption: '☕ Enjoy!' }, { quoted: mek });
        } catch (e) {
            reply(error('Could not fetch a coffee photo right now.'));
        }
    });

// ── Recipe search (TheMealDB — real, free, no-key API) ──
cmd({ pattern: "recipe", desc: "Search for a recipe by name", category: "tools", react: "🍳", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🍳 *Usage:* .recipe <dish name>");
        try {
            const data = await get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`);
            const meal = data.meals?.[0];
            if (!meal) return reply(error(`No recipe found for "${q}".`));
            const ingredients = [];
            for (let i = 1; i <= 20; i++) {
                const ing = meal[`strIngredient${i}`];
                const measure = meal[`strMeasure${i}`];
                if (ing && ing.trim()) ingredients.push(`• ${measure?.trim() || ''} ${ing.trim()}`.trim());
            }
            const steps = meal.strInstructions.split(/\r?\n/).filter(Boolean).slice(0, 8).join('\n');
            await conn.sendMessage(m.chat, {
                image: { url: meal.strMealThumb },
                caption: success(`🍳 *${meal.strMeal}*\n📍 ${meal.strArea} · ${meal.strCategory}\n\n*Ingredients:*\n${ingredients.join('\n')}\n\n*Steps:*\n${steps}`),
            }, { quoted: mek });
        } catch (e) {
            reply(error('Recipe search failed.'));
        }
    });

// ── Recipe by ingredient (TheMealDB filter endpoint) ──
cmd({ pattern: "recipe-ingredient", desc: "Find dishes using a specific ingredient", category: "tools", react: "🥕", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🥕 *Usage:* .recipe-ingredient <ingredient>");
        try {
            const data = await get(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(q)}`);
            const meals = data.meals?.slice(0, 8);
            if (!meals?.length) return reply(error(`No dishes found using "${q}".`));
            reply(success(`🥕 *Dishes with ${q}:*\n\n${meals.map(m2 => `• ${m2.strMeal}`).join('\n')}\n\n_Use .recipe <name> for full details._`));
        } catch (e) {
            reply(error('Ingredient search failed.'));
        }
    });

// ── Anime search (Jikan — the well-known free MyAnimeList API) ──
cmd({ pattern: "anime", desc: "Search for anime details", category: "tools", react: "🎌", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🎌 *Usage:* .anime <title>");
        try {
            const data = await get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=1`);
            const a = data.data?.[0];
            if (!a) return reply(error(`No anime found for "${q}".`));
            await conn.sendMessage(m.chat, {
                image: { url: a.images?.jpg?.image_url },
                caption: success(`🎌 *${a.title}*\n⭐ Score: ${a.score || 'N/A'}\n📺 Episodes: ${a.episodes || '?'}\n📅 ${a.aired?.string || 'N/A'}\n\n${(a.synopsis || '').slice(0, 400)}${a.synopsis?.length > 400 ? '...' : ''}`),
            }, { quoted: mek });
        } catch (e) {
            reply(error('Anime search failed.'));
        }
    });

// ── Name-based fun predictions (agify/genderize/nationalize — real, free, no-key APIs) ──
cmd({ pattern: "whoami", desc: "Guess age, gender and likely nationality from a first name (just for fun)", category: "fun", react: "🔮", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        const name = (q || m.pushName || 'friend').split(' ')[0];
        try {
            const [age, gender, nat] = await Promise.all([
                get(`https://api.agify.io?name=${encodeURIComponent(name)}`),
                get(`https://api.genderize.io?name=${encodeURIComponent(name)}`),
                get(`https://api.nationalize.io?name=${encodeURIComponent(name)}`),
            ]);
            const topCountry = nat.country?.[0];
            reply(success(
                `🔮 *For the name "${name}"* (statistical guess, just for fun):\n\n` +
                `🎂 Likely age: ~${age.age ?? '?'}\n` +
                `🚻 Likely gender: ${gender.gender || 'unclear'} (${Math.round((gender.probability || 0) * 100)}% confidence)\n` +
                `🌍 Likely origin: ${topCountry ? `${topCountry.country_id} (${Math.round(topCountry.probability * 100)}%)` : 'unclear'}`
            ));
        } catch (e) {
            reply(error('Could not fetch a prediction right now.'));
        }
    });

// ── Terms of Service (static — describes THIS bot, not a fake license gate) ──
cmd({ pattern: "tos", alias: ["terms"], desc: "Show the bot's terms of service", category: "tools", react: "📜", filename: __filename },
    async (conn, mek, m, { reply }) => {
        reply(
            `📜 *🥰 MONA LISA 🤭 — Terms of Service*\n\n` +
            `This bot is provided as-is by Progress Tech. By using it you agree to:\n\n` +
            `• Not use it to harass, spam, or harm others\n` +
            `• Not attempt to abuse, overload, or reverse-engineer its infrastructure\n` +
            `• Understand that AI-generated content may be inaccurate\n` +
            `• Understand this bot connects via an unofficial WhatsApp library, and use is at your own discretion regarding WhatsApp's own Terms of Service\n\n` +
            `Questions? Contact the owner via *.owner*.`
        );
    });
