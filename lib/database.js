const mongoose = require('mongoose');
const config = require('../config');

// Retries the initial connection a few times with backoff, since a
// single transient failure at boot (Atlas cold start, brief network
// blip) would otherwise silently disable session persistence for the
// entire process lifetime with no second attempt.
const connectdb = async (attempt = 1, maxAttempts = 5) => {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(config.MONGODB_URI, {
            maxPoolSize: 50,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log("✅ Database Connected Successfully");
    } catch (e) {
        console.error(`❌ Database Connection Failed (attempt ${attempt}/${maxAttempts}):`, e.message);
        if (attempt < maxAttempts) {
            const backoffMs = Math.min(5000 * attempt, 30000);
            console.log(`🔄 Retrying MongoDB connection in ${backoffMs / 1000}s...`);
            setTimeout(() => connectdb(attempt + 1, maxAttempts), backoffMs);
        } else {
            console.error("❌ Giving up on MongoDB after multiple attempts — sessions will NOT persist across restarts until this is fixed and the process is restarted.");
        }
    }
};

// Visibility into the connection after the initial attempt succeeds —
// otherwise a mid-session drop happens with zero trace in the logs.
mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
});
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected — session persistence is paused until it reconnects.');
});
mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected — session persistence resumed.');
});

// ====================================
// MODÈLES
// ====================================

const sessionSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    credentials: {
        type: Object,
        required: true
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const userConfigSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    config: {
        AUTO_RECORDING: { type: String, default: 'false' },
        AUTO_TYPING: { type: String, default: 'false' },
        ANTI_CALL: { type: String, default: 'false' },
        REJECT_MSG: { type: String, default: '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..!*' },
        READ_MESSAGE: { type: String, default: 'false' },
        AUTO_VIEW_STATUS: { type: String, default: 'false' },
        AUTO_LIKE_STATUS: { type: String, default: 'false' },
        AUTO_STATUS_REPLY: { type: String, default: 'false' },
        AUTO_STATUS_MSG: { type: String, default: 'Hello from black popkid!' },
        AUTO_LIKE_EMOJI: { type: Array, default: ['❤️', '👍', '😮', '😎'] },
        
        // ========== NEW ANTIDELETE FIELD ==========
        ANTIDELETE: { type: String, default: 'true' }  // true = enabled, false = disabled
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true,
        index: true 
    },
    otp: { type: String, required: true },
    config: { type: Object, required: true },
    expiresAt: { 
        type: Date, 
        default: () => new Date(Date.now() + 5 * 60000), // 5 minutes
        index: { expires: '5m' }
    },
    createdAt: { type: Date, default: Date.now }
});

// 4. Numéros actifs (pour reconnexion)
const activeNumberSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    lastConnected: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    connectionInfo: {
        ip: String,
        userAgent: String,
        timestamp: Date
    }
});

const statsSchema = new mongoose.Schema({
    number: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    commandsUsed: { type: Number, default: 0 },
    messagesReceived: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    groupsInteracted: { type: Number, default: 0 }
});

// Distributed connection lock — ensures only ONE process can hold an active
// WhatsApp socket for a given number at a time, even across multiple server
// instances/replicas or an overlapping redeploy. A plain in-memory lock
// (a JS variable) only protects within a single process; this is the
// cross-process equivalent, backed by Mongo's unique index for atomic
// acquisition and a TTL index so a crashed process's lock self-expires
// instead of permanently blocking that number.
const connectionLockSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    processId: { type: String, required: true },
    lockedAt: { type: Date, default: Date.now },
    heartbeatAt: { type: Date, default: Date.now, index: { expires: '90s' } }
});

// ===============================
// DÉFINITION DES MODÈLES
// ===============================

const Session = mongoose.model('Session', sessionSchema);
const UserConfig = mongoose.model('UserConfig', userConfigSchema);
const OTP = mongoose.model('OTP', otpSchema);
const ActiveNumber = mongoose.model('ActiveNumber', activeNumberSchema);
const Stats = mongoose.model('Stats', statsSchema);
const ConnectionLock = mongoose.model('ConnectionLock', connectionLockSchema);

// ====================================
// FONCTIONS
// ==================================

// Sauvegarde session
async function saveSessionToMongoDB(number, credentials) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await Session.findOneAndUpdate(
            { number: cleanNumber },
            { 
                credentials: credentials,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        console.log(`📁 Session saved to MongoDB for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving session to MongoDB:', error);
        return false;
    }
}

// Récupération session
async function getSessionFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const session = await Session.findOne({ number: cleanNumber });
        return session ? session.credentials : null;
    } catch (error) {
        console.error('❌ Error getting session from MongoDB:', error);
        return null;
    }
}

// Suppression session
async function deleteSessionFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await Session.deleteOne({ number: cleanNumber });
        await ActiveNumber.deleteOne({ number: cleanNumber });
        
        console.log(`🗑️ Session deleted from MongoDB for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error deleting session from MongoDB:', error);
        return false;
    }
}

// Configuration utilisateur
async function getUserConfigFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const config = await UserConfig.findOne({ number: cleanNumber });
        
        if (config) {
            return config.config;
        } else {
            // Configuration par défaut avec ANTIDELETE
            const defaultConfig = {
                AUTO_RECORDING: 'false',
                AUTO_TYPING: 'false',
                ANTI_CALL: 'false',
                REJECT_MSG: '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..!*',
                READ_MESSAGE: 'false',
                AUTO_VIEW_STATUS: 'true',
                AUTO_LIKE_STATUS: 'true',
                AUTO_STATUS_REPLY: 'false',
                AUTO_STATUS_MSG: 'Hello from black popkid!',
                AUTO_LIKE_EMOJI: ['❤️', '👍', '😮', '😎'],
                ANTIDELETE: 'true'  // Default enabled
            };
            
            // Sauvegarde configuration par défaut
            await UserConfig.create({
                number: cleanNumber,
                config: defaultConfig
            });
            
            return defaultConfig;
        }
    } catch (error) {
        console.error('❌ Error getting user config from MongoDB:', error);
        return { ANTIDELETE: 'true' };
    }
}

// Mise à jour configuration
async function updateUserConfigInMongoDB(number, newConfig) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        
        // Get existing config first
        const existing = await UserConfig.findOne({ number: cleanNumber });
        let updatedConfig = {};
        
        if (existing) {
            updatedConfig = { ...existing.config, ...newConfig };
        } else {
            // Default config with ANTIDELETE
            updatedConfig = {
                AUTO_RECORDING: 'false',
                AUTO_TYPING: 'false',
                ANTI_CALL: 'false',
                REJECT_MSG: '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..!*',
                READ_MESSAGE: 'false',
                AUTO_VIEW_STATUS: 'true',
                AUTO_LIKE_STATUS: 'true',
                AUTO_STATUS_REPLY: 'false',
                AUTO_STATUS_MSG: 'Hello from black popkid!',
                AUTO_LIKE_EMOJI: ['❤️', '👍', '😮', '😎'],
                ANTIDELETE: 'true',
                ...newConfig
            };
        }
        
        await UserConfig.findOneAndUpdate(
            { number: cleanNumber },
            { 
                config: updatedConfig,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        console.log(`⚙️ Config updated for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error updating user config in MongoDB:', error);
        return false;
    }
}

// Gestion OTP
async function saveOTPToMongoDB(number, otp, config) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await OTP.create({
            number: cleanNumber,
            otp: otp,
            config: config
        });
        console.log(`🔐 OTP saved for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving OTP to MongoDB:', error);
        return false;
    }
}

async function verifyOTPFromMongoDB(number, otp) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const otpRecord = await OTP.findOne({ 
            number: cleanNumber, 
            otp: otp,
            expiresAt: { $gt: new Date() }
        });
        
        if (!otpRecord) {
            return { valid: false, error: 'Invalid or expired OTP' };
        }
        
        // Supprime OTP après vérification
        await OTP.deleteOne({ _id: otpRecord._id });
        
        return {
            valid: true,
            config: otpRecord.config
        };
    } catch (error) {
        console.error('❌ Error verifying OTP from MongoDB:', error);
        return { valid: false, error: 'Verification error' };
    }
}

// Gestion numéros actifs
async function addNumberToMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await ActiveNumber.findOneAndUpdate(
            { number: cleanNumber },
            { 
                lastConnected: new Date(),
                isActive: true
            },
            { upsert: true, new: true }
        );
        return true;
    } catch (error) {
        console.error('❌ Error adding number to MongoDB:', error);
        return false;
    }
}

async function removeNumberFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await ActiveNumber.deleteOne({ number: cleanNumber });
        return true;
    } catch (error) {
        console.error('❌ Error removing number from MongoDB:', error);
        return false;
    }
}

async function getAllNumbersFromMongoDB() {
    try {
        const activeNumbers = await ActiveNumber.find({ isActive: true });
        return activeNumbers.map(num => num.number);
    } catch (error) {
        console.error('❌ Error getting numbers from MongoDB:', error);
        return [];
    }
}

// Statistiques
async function incrementStats(number, field) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const today = new Date().toISOString().split('T')[0];
        
        await Stats.findOneAndUpdate(
            { number: cleanNumber, date: today },
            { $inc: { [field]: 1 } },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('❌ Error updating stats:', error);
    }
}

async function getStatsForNumber(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const stats = await Stats.find({ number: cleanNumber })
            .sort({ date: -1 })
            .limit(30);
        return stats;
    } catch (error) {
        console.error('❌ Error getting stats:', error);
        return [];
    }
}

// ── Distributed connection lock ──
// Returns true if the lock was acquired (safe to connect), false if another
// process already holds an active (non-expired) lock for this number.
async function acquireConnectionLock(number, processId) {
    try {
        await ConnectionLock.create({ number, processId, lockedAt: new Date(), heartbeatAt: new Date() });
        return true;
    } catch (e) {
        if (e.code === 11000) return false; // duplicate key — someone else holds it
        throw e;
    }
}

// Keeps an already-acquired lock alive. Scoped to processId so a process can
// only ever refresh its own lock, never steal/extend someone else's.
async function heartbeatConnectionLock(number, processId) {
    try {
        await ConnectionLock.updateOne({ number, processId }, { heartbeatAt: new Date() });
    } catch (_) {}
}

async function releaseConnectionLock(number, processId) {
    try {
        await ConnectionLock.deleteOne({ number, processId });
    } catch (_) {}
}

// Unlike releaseConnectionLock, this isn't scoped to a processId — it's for
// the explicit force-code/force-reset paths, where the whole point is to
// override whatever currently holds the connection, including a lock held
// by a different process.
async function forceReleaseConnectionLock(number) {
    try {
        await ConnectionLock.deleteOne({ number });
    } catch (_) {}
}

async function getConnectionLockHolder(number) {
    try {
        const lock = await ConnectionLock.findOne({ number });
        return lock ? lock.processId : null;
    } catch (_) {
        return null;
    }
}

// =================================
// EXPORTS 
// =================================

module.exports = {
    connectdb,

    Session,
    UserConfig,
    OTP,
    ActiveNumber,
    Stats,
    ConnectionLock,

    // Fonctions session
    saveSessionToMongoDB,
    getSessionFromMongoDB,
    deleteSessionFromMongoDB,

    // Distributed connection lock
    acquireConnectionLock,
    heartbeatConnectionLock,
    releaseConnectionLock,
    forceReleaseConnectionLock,
    getConnectionLockHolder,

    // Fonctions configuration
    getUserConfigFromMongoDB,
    updateUserConfigInMongoDB,
    
    // Fonctions OTP
    saveOTPToMongoDB,
    verifyOTPFromMongoDB,
    
    // Fonctions numéros
    addNumberToMongoDB,
    removeNumberFromMongoDB,
    getAllNumbersFromMongoDB,
    
    // Fonctions statistiques
    incrementStats,
    getStatsForNumber,
    
    // Anciennes fonctions (pour compatibilité)
    getUserConfig: async (number) => {
        const config = await getUserConfigFromMongoDB(number);
        return config || {};
    },
    updateUserConfig: updateUserConfigInMongoDB
};
