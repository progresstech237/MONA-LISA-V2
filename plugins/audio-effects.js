// ═══════════════════════════════════════════════════════════════════════════
//   🎧 AUDIO EFFECTS — MONA LISA
//   Powered by Progress Tech
//   Reply to any audio or voice note. Real ffmpeg processing, fully local.
// ═══════════════════════════════════════════════════════════════════════════

const { cmd } = require('../redx');
const { applyEffect } = require('../lib/audio-effects');
const { success, error, loading } = require('../lib/responses');

// [pattern, effect key, emoji, aliases]
const EFFECTS = [
    ['bass', 'bass', '🔊', []],
    ['nightcore', 'nightcore', '🌙', []],
    ['slow', 'slow', '🐢', []],
    ['fast', 'fast', '🐇', []],
    ['reverse', 'reverse', '⏪', []],
    ['deep', 'deep', '🕳️', []],
    ['smooth', 'smooth', '🎚️', []],
    ['squirrel', 'squirrel', '🐿️', []],
    ['8d', 'eightd', '🎧', []],
    ['blown', 'blown', '💥', []],
];

for (const [pattern, effectKey, emoji, alias] of EFFECTS) {
    cmd({
        pattern,
        alias,
        desc: `Apply a ${pattern} effect to a replied audio/voice note`,
        category: 'tools',
        react: emoji,
        filename: __filename,
    }, async (conn, mek, m, { reply }) => {
        if (!m.quoted || m.quoted.mtype !== 'audioMessage') {
            return reply(`${emoji} *Usage:* Reply to an audio or voice note with .${pattern}`);
        }
        try {
            await reply(loading('Processing the audio...'));
            const input = await m.quoted.download();
            const output = await applyEffect(input, effectKey);
            await conn.sendMessage(m.chat, {
                audio: output,
                mimetype: 'audio/mpeg',
                ptt: m.quoted.message?.audioMessage?.ptt || false,
            }, { quoted: mek });
        } catch (e) {
            reply(error(`Couldn't apply the ${pattern} effect: ${e.message}`));
        }
    });
}
