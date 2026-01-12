const CryptoJS = require('crypto-js');

/**
 * Encrypt content using AES-256-GCM
 * Compatible with web frontend encryption
 */
function encryptContent(content, password) {
    // Generate random salt and IV
    const salt = CryptoJS.lib.WordArray.random(16);
    const iv = CryptoJS.lib.WordArray.random(12);

    // Derive key using PBKDF2
    const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 100000,
        hasher: CryptoJS.algo.SHA256
    });

    // Encrypt
    const encrypted = CryptoJS.AES.encrypt(content, key, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
    });

    return {
        ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
        salt: salt.toString(CryptoJS.enc.Base64),
        iv: iv.toString(CryptoJS.enc.Base64)
    };
}

/**
 * Decrypt content using AES-256-GCM
 * Compatible with web frontend encryption
 */
function decryptContent(encryptedData, password) {
    try {
        const salt = CryptoJS.enc.Base64.parse(encryptedData.salt);
        const iv = CryptoJS.enc.Base64.parse(encryptedData.iv);
        const ciphertext = CryptoJS.enc.Base64.parse(encryptedData.ciphertext || encryptedData.content);

        // Derive key using PBKDF2
        const key = CryptoJS.PBKDF2(password, salt, {
            keySize: 256 / 32,
            iterations: 100000,
            hasher: CryptoJS.algo.SHA256
        });

        // Decrypt
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.GCM,
                padding: CryptoJS.pad.NoPadding
            }
        );

        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        throw new Error('Decryption failed. Invalid password?');
    }
}

/**
 * Encode content to Base64
 */
function toBase64(content) {
    return Buffer.from(content).toString('base64');
}

/**
 * Decode content from Base64
 */
function fromBase64(encoded) {
    return Buffer.from(encoded, 'base64').toString('utf8');
}

module.exports = {
    encryptContent,
    decryptContent,
    toBase64,
    fromBase64
};
