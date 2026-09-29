const { cmd } = require('../redx');
const crypto = require('crypto');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

cmd({
  pattern: "lottie",
  react: "🎨",
  desc: "Extract and resend lottie sticker",
  category: "progresstech tools",
  use: ".lottie (reply to lottie sticker)",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    if (!m.quoted) {
        return reply(`*🎨 LOTTIE STICKER TOOL 👑*\n\n*Extract lottie stickers.*\n\n*Usage:*\n*👑 ${prefix}lottie (reply to lottie sticker) 👑*\n\n*⚡ Powered by Omegatech*`);
    }

    const quoted = m.quoted;
    const stickerMsg = quoted.message?.stickerMessage || quoted.msg?.stickerMessage || quoted.stickerMessage || quoted;
    const isLottie = stickerMsg?.isLottie === true || stickerMsg?.mimetype === 'application/was';

    if (!isLottie) {
        return reply(`*❌ Please reply to a lottie sticker (animated sticker).*`);
    }

    reply(`*🔄 Processing lottie sticker...*`);

    const stickerData = stickerMsg;

    let stickerMessage = {
        url: stickerData.url || stickerData.directPath,
        fileSha256: stickerData.fileSha256 || crypto.randomBytes(32).toString('base64'),
        fileEncSha256: stickerData.fileEncSha256 || crypto.randomBytes(32).toString('base64'),
        mediaKey: stickerData.mediaKey || crypto.randomBytes(32).toString('base64'),
        mimetype: 'application/was',
        height: stickerData.height || 512,
        width: stickerData.width || 512,
        directPath: stickerData.directPath || stickerData.url,
        fileLength: stickerData.fileLength || '35394',
        mediaKeyTimestamp: stickerData.mediaKeyTimestamp || Math.floor(Date.now() / 1000).toString(),
        isAnimated: true,
        isLottie: true,
        stickerSentTs: Date.now().toString(),
        isAvatar: false,
        isAiSticker: false
    };

    const message = generateWAMessageFromContent(
        from,
        {
            lottieStickerMessage: {
                message: {
                    stickerMessage: stickerMessage
                }
            }
        },
        { userJid: conn.user.id }
    );

    const additionalNodes = [];
    if (!from.endsWith('@g.us') && from.endsWith('@s.whatsapp.net')) {
        additionalNodes.push({
            tag: 'bot',
            attrs: { biz_bot: '1' },
            content: undefined
        });
    }

    await conn.relayMessage(
        from,
        message.message,
        {
            messageId: message.key.id,
            additionalNodes: additionalNodes
        }
    );

    reply(`*✅ Lottie sticker sent successfully!*`);

  } catch (e) {
    console.error('Lottie error:', e);
    reply(`*❌ Error: ${e.message || 'Unknown error'}*`);
  }
});