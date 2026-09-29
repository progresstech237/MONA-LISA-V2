// ═══════════════════════════════════════════════════════════════════════════
//   🧑‍💻 DEV & SECURITY UTILITIES — MONA LISA
//   Powered by Progress Tech
//   Everything here is pure local logic — no external API, no network
//   calls, nothing that touches a third-party target. Purely informational
//   encode/decode/hash/cipher tools, safe for anyone to use.
// ═══════════════════════════════════════════════════════════════════════════

const { cmd } = require('../redx');
const crypto = require('crypto');
const { success, error } = require('../lib/responses');

// ── Base64 ──
cmd({ pattern: "base64", desc: "Encode or decode Base64: .base64 encode|decode <text>", category: "tools", react: "🔤", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q || !q.includes('|')) return reply("🔤 *Usage:* .base64 encode|<text>  or  .base64 decode|<text>");
        const [mode, ...rest] = q.split('|');
        const text = rest.join('|');
        try {
            const result = mode.trim().toLowerCase() === 'decode'
                ? Buffer.from(text, 'base64').toString('utf8')
                : Buffer.from(text, 'utf8').toString('base64');
            reply(success(result));
        } catch (e) {
            reply(error('Invalid input for that operation.'));
        }
    });

// ── URL encode/decode ──
cmd({ pattern: "urlencode", desc: "URL-encode text", category: "tools", react: "🔗", filename: __filename },
    async (conn, mek, m, { reply, q }) => q ? reply(success(encodeURIComponent(q))) : reply("🔗 *Usage:* .urlencode <text>"));
cmd({ pattern: "urldecode", desc: "URL-decode text", category: "tools", react: "🔗", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🔗 *Usage:* .urldecode <text>");
        try { reply(success(decodeURIComponent(q))); } catch (e) { reply(error('Invalid URL-encoded text.')); }
    });

// ── Hashing ──
cmd({ pattern: "hash", desc: "Hash text: .hash <algorithm>|<text> (md5, sha1, sha256, sha512)", category: "tools", react: "#️⃣", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q || !q.includes('|')) return reply("#️⃣ *Usage:* .hash <md5|sha1|sha256|sha512>|<text>");
        const [algo, ...rest] = q.split('|');
        const text = rest.join('|');
        const a = algo.trim().toLowerCase();
        if (!['md5', 'sha1', 'sha256', 'sha512'].includes(a)) return reply(error('Supported: md5, sha1, sha256, sha512'));
        reply(success(crypto.createHash(a).update(text).digest('hex')));
    });

// ── JWT decode (read-only — no signature verification, no forging) ──
cmd({ pattern: "jwtdecode", desc: "Decode a JWT's header and payload (read-only, no verification)", category: "tools", react: "🔑", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🔑 *Usage:* .jwtdecode <token>");
        const parts = q.trim().split('.');
        if (parts.length < 2) return reply(error('That doesn\'t look like a valid JWT (expected header.payload.signature).'));
        try {
            const decode = (p) => JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
            const header = decode(parts[0]);
            const payload = decode(parts[1]);
            reply(success(`*Header:*\n\`\`\`${JSON.stringify(header, null, 2)}\`\`\`\n\n*Payload:*\n\`\`\`${JSON.stringify(payload, null, 2)}\`\`\`\n\n_This is a read-only decode — the signature was not verified._`));
        } catch (e) {
            reply(error('Could not decode that token.'));
        }
    });

// ── Timestamp ──
cmd({ pattern: "timestamp", desc: "Convert a Unix timestamp to a readable date, or get the current one", category: "tools", react: "🕰️", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply(success(`Current Unix timestamp: ${Math.floor(Date.now() / 1000)}`));
        const ts = parseInt(q.trim(), 10);
        if (isNaN(ts)) return reply(error('Please provide a valid Unix timestamp (seconds).'));
        const ms = q.trim().length > 10 ? ts : ts * 1000;
        reply(success(new Date(ms).toUTCString()));
    });

// ── JSON validate/pretty-print ──
cmd({ pattern: "json", desc: "Validate and pretty-print JSON", category: "tools", react: "🧾", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q) return reply("🧾 *Usage:* .json <json text>");
        try {
            reply(success(`\`\`\`${JSON.stringify(JSON.parse(q), null, 2)}\`\`\``));
        } catch (e) {
            reply(error(`Invalid JSON: ${e.message}`));
        }
    });

// ── Regex test ──
cmd({ pattern: "regex", desc: "Test a regex: .regex <pattern>|<text>", category: "tools", react: "🔍", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q || !q.includes('|')) return reply("🔍 *Usage:* .regex <pattern>|<text to test>");
        const [pattern, ...rest] = q.split('|');
        const text = rest.join('|');
        try {
            const re = new RegExp(pattern.trim(), 'g');
            const matches = [...text.matchAll(re)].map(m2 => m2[0]);
            reply(success(matches.length ? `✅ ${matches.length} match(es):\n${matches.join(', ')}` : '❌ No matches.'));
        } catch (e) {
            reply(error(`Invalid regex: ${e.message}`));
        }
    });

// ── Classic ciphers (CTF/educational) ──
function caesar(text, shift) {
    return text.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26 + 26) % 26 + base);
    });
}
cmd({ pattern: "caesar", desc: "Caesar cipher: .caesar <shift>|<text>", category: "tools", react: "🔐", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q || !q.includes('|')) return reply("🔐 *Usage:* .caesar <shift>|<text>");
        const [shiftStr, ...rest] = q.split('|');
        const shift = parseInt(shiftStr.trim(), 10);
        if (isNaN(shift)) return reply(error('Shift must be a number.'));
        reply(success(caesar(rest.join('|'), shift)));
    });

cmd({ pattern: "rot13", desc: "ROT13 encode/decode text", category: "tools", react: "🔐", filename: __filename },
    async (conn, mek, m, { reply, q }) => q ? reply(success(caesar(q, 13))) : reply("🔐 *Usage:* .rot13 <text>"));

cmd({ pattern: "xor", desc: "XOR cipher: .xor <key>|<text>", category: "tools", react: "🔐", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q || !q.includes('|')) return reply("🔐 *Usage:* .xor <key>|<text>");
        const [key, ...rest] = q.split('|');
        const text = rest.join('|');
        const out = [...text].map((c, i) => c.charCodeAt(0) ^ key.charCodeAt(i % key.length)).map(n => n.toString(16).padStart(2, '0')).join('');
        reply(success(`Hex output: ${out}\n\n_Run the same command with the hex-decoded bytes to reverse it._`));
    });

cmd({ pattern: "hex", desc: "Convert text to hex, or hex back to text: .hex encode|decode <text>", category: "tools", react: "🔢", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q || !q.includes('|')) return reply("🔢 *Usage:* .hex encode|<text>  or  .hex decode|<hex>");
        const [mode, ...rest] = q.split('|');
        const text = rest.join('|').trim();
        try {
            const result = mode.trim().toLowerCase() === 'decode'
                ? Buffer.from(text, 'hex').toString('utf8')
                : Buffer.from(text, 'utf8').toString('hex');
            reply(success(result));
        } catch (e) { reply(error('Invalid input.')); }
    });

cmd({ pattern: "binary", desc: "Convert text to binary, or binary back to text: .binary encode|decode <text>", category: "tools", react: "🔢", filename: __filename },
    async (conn, mek, m, { reply, q }) => {
        if (!q || !q.includes('|')) return reply("🔢 *Usage:* .binary encode|<text>  or  .binary decode|<binary>");
        const [mode, ...rest] = q.split('|');
        const text = rest.join('|').trim();
        try {
            if (mode.trim().toLowerCase() === 'decode') {
                const result = text.split(/\s+/).map(b => String.fromCharCode(parseInt(b, 2))).join('');
                reply(success(result));
            } else {
                const result = [...text].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
                reply(success(result));
            }
        } catch (e) { reply(error('Invalid input.')); }
    });


