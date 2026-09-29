// lib/antiedit.js
// Detects WhatsApp's native "edit message" feature and notifies the owner
// with the before/after text. Uses the same 'messages.update' event stream
// antidelete already listens on, just a different signal within it.

const { getContentType } = require('@whiskeysockets/baileys');
const config = require('../config');

function extractText(message) {
    if (!message) return null;
    const type = getContentType(message);
    if (type === 'conversation') return message.conversation;
    if (type === 'extendedTextMessage') return message.extendedTextMessage.text;
    if (type === 'imageMessage') return message.imageMessage.caption || null;
    if (type === 'videoMessage') return message.videoMessage.caption || null;
    return null;
}

async function handleAntiEdit(conn, updates, store) {
    try {
        const ownerNumbers = config.OWNER_NUMBER || [];
        if (!ownerNumbers.length) return;
        const ownerJids = ownerNumbers.map(n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net');

        for (const update of updates) {
            const protocolMsg = update.update?.message?.protocolMessage;
            // WhatsApp represents a message edit as a protocolMessage carrying
            // the new content in `editedMessage` — checking for that field's
            // presence is more version-stable across Baileys releases than
            // relying on a specific numeric `type` enum value.
            if (!protocolMsg?.editedMessage) continue;

            const key = update.key;
            const editedText = extractText(protocolMsg.editedMessage);
            if (!editedText) continue; // only handle text/caption edits for now

            let originalText = null;
            try {
                const original = await store.loadMessage(key.remoteJid, key.id);
                originalText = extractText(original?.message);
            } catch (_) { /* original not in store — that's fine, we'll show just the new text */ }

            const sender = key.participant || key.remoteJid;
            const isGroup = key.remoteJid.endsWith('@g.us');
            let chatName = 'Private Chat';
            if (isGroup) {
                try { chatName = (await conn.groupMetadata(key.remoteJid)).subject || 'Unknown Group'; } catch (_) {}
            }

            const notice =
                `✏️ *MESSAGE EDITED DETECTED!*\n\n` +
                `📱 *From:* @${sender.split('@')[0]}\n` +
                `💬 *Chat:* ${chatName}\n` +
                (originalText ? `📝 *Before:* ${originalText}\n` : '') +
                `✏️ *After:* ${editedText}\n` +
                `🕐 *Time:* ${new Date().toLocaleString()}`;

            for (const ownerJid of ownerJids) {
                try {
                    await conn.sendMessage(ownerJid, { text: notice, mentions: [sender] });
                } catch (err) {
                    console.error(`[ANTIEDIT] Failed to send to ${ownerJid}:`, err.message);
                }
            }
        }
    } catch (error) {
        console.error('[ANTIEDIT ERROR]', error.message);
    }
}

module.exports = { handleAntiEdit };
