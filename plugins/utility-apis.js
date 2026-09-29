// ═══════════════════════════════════════════════════════════════════════════
//   🔧 UTILITY APIs — MONA LISA
//   Powered by Progress Tech
//   Every command here hits a real, free, publicly documented API.
//   No API keys required for any of these.
// ═══════════════════════════════════════════════════════════════════════════

const { cmd } = require('../redx');
const axios = require('axios');
const math = require('mathjs');
const crypto = require('crypto');
const { success, error } = require('../lib/responses');

const get = (url, opts = {}) => axios.get(url, { timeout: 15000, ...opts }).then(r => r.data);

cmd({ pattern: "dictionary", alias: ["define"], desc: "Look up a word's definition", category: "tools", react: "📖", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("📖 *Usage:* .dictionary <word>");
        try {
            const data = await get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`);
            const entry = data[0];
            let out = `📖 *${entry.word}*`;
            if (entry.phonetic) out += ` /${entry.phonetic}/`;
            for (const m2 of entry.meanings.slice(0, 3)) {
                out += `\n\n*${m2.partOfSpeech}*`;
                for (const d of m2.definitions.slice(0, 2)) out += `\n• ${d.definition}`;
            }
            reply(success(out));
        } catch (e) {
            reply(error(`No definition found for "${q}".`));
        }
    });

cmd({ pattern: "urban", alias: ["slang"], desc: "Search Urban Dictionary for slang", category: "tools", react: "🗣️", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🗣️ *Usage:* .urban <term>");
        try {
            const data = await get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(q)}`);
            const top = data.list?.[0];
            if (!top) return reply(error(`No Urban Dictionary results for "${q}".`));
            reply(success(`🗣️ *${top.word}*\n\n${top.definition.replace(/[\[\]]/g, '')}\n\n_Example:_ ${top.example.replace(/[\[\]]/g, '')}`));
        } catch (e) {
            reply(error('Urban Dictionary lookup failed.'));
        }
    });

cmd({ pattern: "weather", alias: ["forecast"], desc: "Get current weather for a location", category: "tools", react: "🌦️", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🌦️ *Usage:* .weather <city>");
        try {
            const text = await get(`https://wttr.in/${encodeURIComponent(q)}?format=3`);
            reply(success(`🌦️ ${text.trim()}`));
        } catch (e) {
            reply(error(`Couldn't fetch weather for "${q}".`));
        }
    });

cmd({ pattern: "currency", alias: ["convert"], desc: "Convert between currencies", category: "tools", react: "💱", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("💱 *Usage:* .currency <amount> <from> <to>\n\nExample: .currency 100 USD EUR");
        const parts = q.trim().split(/\s+/);
        if (parts.length !== 3) return reply(error('Format: .currency <amount> <from> <to>'));
        const [amountRaw, from, to] = parts;
        const amount = parseFloat(amountRaw);
        if (isNaN(amount)) return reply(error('Amount must be a number.'));
        try {
            const data = await get(`https://api.frankfurter.app/latest?amount=${amount}&from=${from.toUpperCase()}&to=${to.toUpperCase()}`);
            const result = data.rates?.[to.toUpperCase()];
            if (result === undefined) return reply(error('Unsupported currency code.'));
            reply(success(`💱 ${amount} ${from.toUpperCase()} = *${result.toFixed(2)} ${to.toUpperCase()}*`));
        } catch (e) {
            reply(error('Currency conversion failed — check the currency codes (e.g. USD, EUR, XAF).'));
        }
    });

cmd({ pattern: "ip", alias: ["ipinfo", "iplookup"], desc: "Get geolocation info about an IP address", category: "tools", react: "🌐", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🌐 *Usage:* .ip <ip address>");
        try {
            const data = await get(`http://ip-api.com/json/${encodeURIComponent(q)}`);
            if (data.status !== 'success') return reply(error(data.message || 'Lookup failed.'));
            reply(success(`🌐 *${data.query}*\n📍 ${data.city}, ${data.regionName}, ${data.country}\n🏢 ISP: ${data.isp}\n🕰️ Timezone: ${data.timezone}`));
        } catch (e) {
            reply(error('IP lookup failed.'));
        }
    });

cmd({ pattern: "github", alias: ["gh"], desc: "Show info about a GitHub repository or user", category: "tools", react: "🐙", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🐙 *Usage:* .github <user/repo> or .github <username>");
        try {
            if (q.includes('/')) {
                const data = await get(`https://api.github.com/repos/${q}`);
                reply(success(`🐙 *${data.full_name}*\n${data.description || ''}\n\n⭐ ${data.stargazers_count} · 🍴 ${data.forks_count} · 🐛 ${data.open_issues_count} issues\n📜 License: ${data.license?.name || 'none'}\n🔗 ${data.html_url}`));
            } else {
                const data = await get(`https://api.github.com/users/${q}`);
                reply(success(`🐙 *${data.login}* ${data.name ? `(${data.name})` : ''}\n${data.bio || ''}\n\n📦 ${data.public_repos} repos · 👥 ${data.followers} followers\n🔗 ${data.html_url}`));
            }
        } catch (e) {
            reply(error(`Couldn't find "${q}" on GitHub.`));
        }
    });

cmd({ pattern: "stackoverflow", alias: ["error"], desc: "Search StackOverflow for a coding question", category: "tools", react: "💻", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("💻 *Usage:* .stackoverflow <search terms>");
        try {
            const data = await get(`https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(q)}&site=stackoverflow`);
            const top = data.items?.slice(0, 5);
            if (!top?.length) return reply(error('No results found.'));
            const list = top.map(i => `• ${i.title}\n  ${i.link}`).join('\n\n');
            reply(success(`💻 *Top StackOverflow results for "${q}"*\n\n${list}`));
        } catch (e) {
            reply(error('StackOverflow search failed.'));
        }
    });

cmd({ pattern: "book", desc: "Search OpenLibrary for book titles", category: "tools", react: "📚", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("📚 *Usage:* .book <title>");
        try {
            const data = await get(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5`);
            const top = data.docs?.slice(0, 5);
            if (!top?.length) return reply(error('No books found.'));
            const list = top.map(b => `• *${b.title}* — ${b.author_name?.[0] || 'Unknown author'} (${b.first_publish_year || '?'})`).join('\n');
            reply(success(`📚 *Results for "${q}"*\n\n${list}`));
        } catch (e) {
            reply(error('Book search failed.'));
        }
    });

cmd({ pattern: "country", alias: ["flag"], desc: "Get detailed information about a country", category: "tools", react: "🌍", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🌍 *Usage:* .country <name>");
        try {
            const data = await get(`https://restcountries.com/v3.1/name/${encodeURIComponent(q)}`);
            const c = data[0];
            reply(success(`${c.flag} *${c.name.common}*\n\n🏛️ Capital: ${c.capital?.[0] || 'N/A'}\n🌍 Region: ${c.region} (${c.subregion || ''})\n👥 Population: ${c.population.toLocaleString()}\n💬 Languages: ${Object.values(c.languages || {}).join(', ')}\n💰 Currency: ${Object.values(c.currencies || {}).map(cu => cu.name).join(', ')}`));
        } catch (e) {
            reply(error(`Couldn't find country "${q}".`));
        }
    });

cmd({ pattern: "iss", desc: "Show the International Space Station's current location", category: "tools", react: "🛰️", filename: __filename },
    async (conn, mek, m, { reply }) => {
        try {
            const data = await get('http://api.open-notify.org/iss-now.json');
            reply(success(`🛰️ *ISS is currently at:*\nLatitude: ${data.iss_position.latitude}\nLongitude: ${data.iss_position.longitude}\n\n🗺️ https://maps.google.com/?q=${data.iss_position.latitude},${data.iss_position.longitude}`));
        } catch (e) {
            reply(error('Could not fetch ISS location.'));
        }
    });

cmd({ pattern: "mathfact", desc: "Get a random interesting math fact", category: "tools", react: "🔢", filename: __filename },
    async (conn, mek, m, { reply }) => {
        try {
            const text = await get('http://numbersapi.com/random/math');
            reply(success(`🔢 ${text}`));
        } catch (e) {
            reply(error('Could not fetch a math fact.'));
        }
    });

cmd({ pattern: "sciencefact", desc: "Get a random interesting fact", category: "fun", react: "🧪", filename: __filename },
    async (conn, mek, m, { reply }) => {
        try {
            const data = await get('https://uselessfacts.jsph.pl/api/v2/facts/random');
            reply(success(`🧪 ${data.text}`));
        } catch (e) {
            reply(error('Could not fetch a fact.'));
        }
    });

cmd({ pattern: "bible", desc: "Look up a Bible verse", category: "tools", react: "📜", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("📜 *Usage:* .bible <reference>\n\nExample: .bible John 3:16");
        try {
            const data = await get(`https://bible-api.com/${encodeURIComponent(q)}`);
            reply(success(`📜 *${data.reference}*\n\n"${data.text.trim()}"\n\n_${data.translation_name}_`));
        } catch (e) {
            reply(error(`Couldn't find that reference.`));
        }
    });

cmd({ pattern: "calc", desc: "Evaluate a mathematical expression", category: "tools", react: "🧮", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🧮 *Usage:* .calc <expression>\n\nExample: .calc (12 * 8) + sqrt(144)");
        try {
            const result = math.evaluate(q);
            reply(success(`🧮 ${q} = *${result}*`));
        } catch (e) {
            reply(error(`Couldn't evaluate that expression: ${e.message}`));
        }
    });

cmd({ pattern: "genpass", desc: "Generate a secure random password", category: "tools", react: "🔐", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        const length = Math.min(Math.max(parseInt(q) || 16, 8), 64);
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
        const bytes = crypto.randomBytes(length);
        const pass = Array.from(bytes, b => chars[b % chars.length]).join('');
        reply(success(`🔐 *Your secure password:*\n\`\`\`${pass}\`\`\`\n\n_Length: ${length} characters_`));
    });
