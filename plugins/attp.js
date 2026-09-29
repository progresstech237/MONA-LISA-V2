const { cmd } = require('../redx')
const { fetchGif, gifToSticker } = require('../lib/sticker-utils')

cmd({
    pattern: "attp",
    alias: ["attptext", "textsticker", "namesticker", "stickername", "at", "att", "atp"],
    react: "✨",
    desc: "Convert text into animated sticker",
    category: "sticker",
    use: ".attp <text>",
    filename: __filename
},
async (conn, mek, m, { args, reply }) => {
    try {
        if (!args[0]) {
            return reply(
                "*🥺 YOU WANT TO MAKE A STICKER OF YOUR NAME*\n\n" +
                "*Use:* `.attp YOUR NAME`\n\n" +
                "*Example:*\n.attp Bilal"
            )
        }

        reply("*✨ YOUR STICKER IS BEING CREATED*\n*PLEASE WAIT A MOMENT...☺️*")

        const text = encodeURIComponent(args.join(" "))
        const gifBuffer = await fetchGif(
            `https://api-fix.onrender.com/api/maker/attp?text=${text}`
        )

        const sticker = await gifToSticker(gifBuffer)

        await conn.sendMessage(
            m.chat,
            { sticker },
            { quoted: mek }
        )

    } catch (e) {
        console.log("ATTP ERROR:", e)
        reply("*❌ AN ERROR OCCURRED WHILE CREATING THE STICKER 🥺*")
    }
})