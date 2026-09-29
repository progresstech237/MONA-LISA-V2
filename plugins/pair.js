// ═══════════════════════════════════════════════════════════════════════════
//   🔗 CHAT-BASED PAIRING — MONA LISA
//
//   Lets a number be linked without opening the web /code page — useful
//   when someone has no easy browser access. Sends the pairing code back
//   in chat; the target number then enters it under WhatsApp > Linked
//   Devices > Link with phone number instead.
//
//   This reuses the exact same redxPair()/requestPairingCode() logic the
//   web pairing page already uses (via a local loopback call) rather than
//   reimplementing pairing a second time — one pairing code path to keep
//   correct and to keep in sync with WhatsApp Web version pinning, number
//   validation, session handling, etc.
//
//   Restricted to the bot owner by default. Generating a pairing code for
//   a number you don't control and getting the target to type it into
//   their own phone is a known account-takeover trick (this is exactly
//   the class of issue this project's earlier .pair/.pair2 commands
//   caused, per the security cleanup notes in the README) — so this is
//   intentionally gated. Set ALLOW_PUBLIC_PAIR_COMMAND=true in .env if you
//   understand and accept that trade-off for your own deployment.
// ═══════════════════════════════════════════════════════════════════════════

const { cmd } = require('../redx');
const axios = require('axios');
const config = require('../config');

const PORT = process.env.PORT || 8000;

// Simple per-requester cooldown so this can't be hammered into a pairing-code
// spam tool even by someone who is allowed to use it.
const lastRequestAt = new Map();
const COOLDOWN_MS = 60 * 1000;

cmd({
    pattern: "pair",
    alias: ["link", "linkpair"],
    desc: "Generate a WhatsApp pairing code for a number, from chat",
    category: "tools",
    react: "🔗",
    use: ".pair 237682432296",
    filename: __filename,
}, async (conn, mek, m, { args, reply, isOwner, senderNumber }) => {
    const publicAccess = config.ALLOW_PUBLIC_PAIR_COMMAND === 'true';
    if (!isOwner && !publicAccess) {
        return reply("❌ *This command is owner-only.*\nAsk the bot owner to run it for you, or use the web pairing page if one has been shared with you.");
    }

    const rawNumber = (args[0] || '').trim();
    if (!rawNumber) {
        return reply(
            "🔗 *Chat Pairing*\n\n" +
            "Usage: *.pair <number>*\n" +
            "Example: *.pair 237682432296*\n\n" +
            "Include the country code, digits only — no spaces, dashes or \"+\"."
        );
    }

    const sanitizedNumber = rawNumber.replace(/[^0-9]/g, '');
    if (!/^[0-9]{8,15}$/.test(sanitizedNumber)) {
        return reply("❌ That doesn't look like a valid WhatsApp number. Include the country code and digits only (8–15 digits total), e.g. 237682432296.");
    }

    const cooldownKey = senderNumber || 'unknown';
    const now = Date.now();
    const last = lastRequestAt.get(cooldownKey) || 0;
    if (now - last < COOLDOWN_MS) {
        const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
        return reply(`⏳ Please wait ${waitSec}s before requesting another pairing code.`);
    }
    lastRequestAt.set(cooldownKey, now);

    await reply(`⏳ Requesting a pairing code for *${sanitizedNumber}*...`);

    try {
        const { data } = await axios.get(`http://localhost:${PORT}/code`, {
            params: { number: sanitizedNumber },
            timeout: 65000,
            validateStatus: () => true, // read the body ourselves for every status
        });

        if (data?.status === 'new_pairing' && data.code) {
            return reply(
                `✅ *Pairing code for ${sanitizedNumber}:*\n\n` +
                `\`\`\`${data.code}\`\`\`\n\n` +
                `On *that* phone: open WhatsApp → *Linked Devices* → *Link with phone number instead* → enter this code *immediately*.\n` +
                `⚠️ It expires in about 60 seconds *from now* — if you're forwarding this to someone else, tell them to have WhatsApp already open on the Linked Devices screen *before* you send it, or it may say "Couldn't link device" by the time they type it in.\n\n` +
                `📺 Having a problem connecting your bot? Watch this step-by-step video:\n` +
                `https://youtube.com/shorts/izJiMNiu9vM?si=mtyU5vJYzKTja62m\n\n` +
                `Don't forget to subscribe first so we drop more updates and you'll be notified! 🔔`
            );
        }

        if (data?.status === 'reconnecting') {
            return reply(`🔄 ${sanitizedNumber} already has a saved session — reconnecting with it instead of generating a new code.`);
        }

        if (data?.status === 'already_connected') {
            return reply(`ℹ️ ${sanitizedNumber} is already connected and active.`);
        }

        if (data?.status === 'connection_in_progress') {
            return reply(`⏳ A pairing attempt for ${sanitizedNumber} is already in progress. Please wait for it to finish before retrying.`);
        }

        // invalid_number, pairing-code failure, or any other error shape
        return reply(`❌ Couldn't generate a pairing code: ${data?.message || data?.error || 'unknown error'}`);
    } catch (e) {
        return reply(`❌ Pairing request failed: ${e.message}`);
    }
});
