const { cmd } = require('../redx');
const { updateUserConfigInMongoDB: updateUserConfig } = require('../lib/database');

// Helper function to update config in memory and database
const updateConfig = async (key, value, botNumber, config, reply) => {
    try {
        // 1. Update in-memory config (Immediate)
        config[key] = value;

        // 2. Update in Database (Persistent)
        const newConfig = {...config };
        newConfig[key] = value;

        await updateUserConfig(botNumber, newConfig);

        return reply(`✅ *${key}* has been updated to: *${value}*`);
    } catch (e) {
        console.error(e);
        return reply("❌ Error while saving to database.");
    }
};

// ============================================================
// 1. PRESENCE MANAGEMENT (Recording / Typing)
// ============================================================

cmd({
    pattern: "autorecording",
    alias: ["autorec", "arecording"],
    desc: "Enable/Disable auto recording simulation",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*THIS COMMAND IS ONLY FOR ME 😎*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_RECORDING', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_RECORDING', 'false', botNumber, config, reply);
    } else {
        reply(`*CURRENTLY :❯ ${config.AUTO_RECORDING} 😊*\n\n*TO TURN ON AUTO RECORDING TYPE ☺️*\n*👑 ❮AUTORECORDING ON❯ 👑*\n*TO TURN OFF AUTORECORDING TYPE ☺️*\n*👑 ❮AUTORECORDING OFF❯ 👑*`);
    }
});

cmd({
    pattern: "autotyping",
    alias: ["autotype", "atyping"],
    desc: "Enable/Disable auto typing simulation",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*THIS COMMAND IS ONLY FOR ME 😎*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_TYPING', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_TYPING', 'false', botNumber, config, reply);
    } else {
        reply(`*CURRENTLY :❯ ${config.AUTO_TYPING} 😊*\n\n*TO TURN ON AUTO TYPING TYPE ☺️*\n*👑 ❮AUTOTYPING ON❯ 👑*\n*TO TURN OFF AUTOTYPING TYPE ☺️*\n*👑 ❮AUTOTYPING OFF❯ 👑*`);
    }
});

// ============================================================
// 2. CALL MANAGEMENT (Anti-Call)
// ============================================================

cmd({
    pattern: "anticall",
    alias: ["acall"],
    desc: "Auto reject calls",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*THIS COMMAND IS ONLY FOR ME ☺️*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('ANTI_CALL', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('ANTI_CALL', 'false', botNumber, config, reply);
    } else {
        reply(`*CURRENTLY :❯ ${config.AUTO_RECORDING} 😊*\n\n*WHOEVER CALLS WILL BE AUTOMATICALLY REJECTED 😃 TO ENABLE THIS SETTING TYPE ☺️*\n*👑 ❮ANTICALL ON❯ 👑*\n*TO DISABLE ANTICALL TYPE ☺️*\n*👑 ❮ANTICALL OFF❯ 👑*`);
    }
});

// ============================================================
// 3. GROUP MANAGEMENT (Welcome / Goodbye)
// ============================================================

cmd({
    pattern: "welcome",
    desc: "Enable/Disable welcome messages",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*THIS COMMAND IS ONLY FOR ME 😎*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('WELCOME', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('WELCOME', 'false', botNumber, config, reply);
    } else {
        reply(`*CURRENTLY :❯ ${config.WELCOME} 😊*\n\n*WHOEVER JOINS THE GROUP WILL GET A WELCOME MESSAGE 😃 TO ENABLE THIS SETTING TYPE ☺️*\n*👑 ❮WELCOME ON❯ 👑*\n*TO DISABLE WELCOME TYPE ☺️*\n*👑 ❮WELCOME OFF❯ 👑*`);
    }
});

cmd({
    pattern: "goodbye",
    desc: "Enable/Disable goodbye messages",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*THIS COMMAND IS ONLY FOR ME 😎*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('GOODBYE', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('GOODBYE', 'false', botNumber, config, reply);
    } else {
        reply(`*CURRENTLY :❯ ${config.GOODBYE} 😊*\n\n*WHOEVER LEAVES THE GROUP WILL GET A GOODBYE MESSAGE 😃 TO ENABLE THIS SETTING TYPE ☺️*\n*👑 ❮GOODBYE ON❯ 👑*\n*TO DISABLE GOODBYE TYPE ☺️*\n*👑 ❮GOODBYE OFF❯ 👑*`);
    }
});

// ============================================================
// 4. READ & STATUS MANAGEMENT
// ============================================================

cmd({
    pattern: "autoread",
    desc: "Enable/Disable auto read messages (Blue Tick)",
    category: "settings",
    react: "👀"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*THIS COMMAND IS ONLY FOR ME 😎*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('READ_MESSAGE', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('READ_MESSAGE', 'false', botNumber, config, reply);
    } else {
        reply(`*CURRENTLY ${config.READ_MESSAGE} 😊*\n*WHOEVER SENDS A MESSAGE, IT WILL BE AUTOMATICALLY SEEN*`);
    }
});

cmd({
    pattern: "autoviewsview",
    alias: ["avs", "statusseen", "astatus"],
    desc: "Auto view status updates",
    category: "settings",
    react: "😎"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*THIS COMMAND IS ONLY FOR ME 😎*");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_VIEW_STATUS', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_VIEW_STATUS', 'false', botNumber, config, reply);
    } else {
        reply(`*CURRENTLY ${config.AUTO_VIEW_STATUS} 😊*\n\n*WHOEVER POSTS A STATUS IT WILL BE AUTOMATICALLY SEEN 😃 TO ENABLE THIS SETTING TYPE ☺️*\n*👑 ❮AUTOSTATUSVIEW ON❯ 👑*\n*TO DISABLE TYPE ☺️*\n*👑 ❮AUTOSTATUSVIEW OFF❯ 👑*`);
    }
});

cmd({
    pattern: "autolikestatus",
    alias: ["als"],
    desc: "Auto like status updates",
    category: "settings",
    react: "❤️"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("🚫 Owner only!");
    const value = args[0]?.toLowerCase();

    if (value === 'on' || value === 'true') {
        await updateConfig('AUTO_LIKE_STATUS', 'true', botNumber, config, reply);
    } else if (value === 'off' || value === 'false') {
        await updateConfig('AUTO_LIKE_STATUS', 'false', botNumber, config, reply);
    } else {
        reply(`Current Status: ${config.AUTO_LIKE_STATUS}\nUsage:.autolikestatus on/off`);
    }
});

// ============================================================
// 5. SYSTEM (Mode & Prefix)
// ============================================================

cmd({
    pattern: "mode",
    desc: "Change bot mode (public/private/groups/inbox)",
    category: "settings",
    react: "⚙️"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*THIS COMMAND IS ONLY FOR ME 😎*");
    const mode = args[0]?.toLowerCase();
    const validModes = ['public', 'private', 'groups', 'inbox'];

    if (validModes.includes(mode)) {
        await updateConfig('WORK_TYPE', mode, botNumber, config, reply);
    } else {
        reply(`*WRONG INPUT 🥺*\n*WRITE LIKE THIS ☺️* COMMAND ❮MODE❯ THEN WRITE ONE OF THESE WORDS WHERE YOU WANT THE BOT TO WORK 🤗*\n ${validModes.join(', ')}\nCurrent: ${config.WORK_TYPE}`);
    }
});

cmd({
    pattern: "setprefix",
    desc: "Change bot prefix",
    category: "settings",
    react: "👑"
},
async(conn, mek, m, { args, isOwner, reply, botNumber, config }) => {
    if (!isOwner) return reply("*THIS COMMAND IS ONLY FOR ME 😎*");
    const newPrefix = args[0];

    if (newPrefix) {
        // Ensure prefix is short (single character or short string)
        if (newPrefix.length > 1 && newPrefix!== 'noprefix') return reply("❌ Prefix must be short (e.g.. or! or #)");

        await updateConfig('PREFIX', newPrefix, botNumber, config, reply);
    } else {
        reply(`*CURRENT PREFIX IS ❮ ${config.PREFIX} ❯ ☺️*\n*SET WHICHEVER SYMBOL YOU WANT TO RUN THE BOT WITH LIKE THIS 😊*\n*❮SETPREFIX.! + _ -❯*\n*WHATEVER YOU LIKE 😍❣️*`);
    }
});