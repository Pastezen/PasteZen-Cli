const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.pastezen');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
    apiUrl: 'https://backend.pastezen.com',
    token: null
};

function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

function getConfig() {
    ensureConfigDir();

    if (!fs.existsSync(CONFIG_FILE)) {
        saveConfig(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
    }

    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch (error) {
        return DEFAULT_CONFIG;
    }
}

function saveConfig(config) {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function setConfigValue(key, value) {
    const config = getConfig();
    config[key] = value;
    saveConfig(config);
}

function getToken() {
    const config = getConfig();
    return config.token;
}

function setToken(token) {
    setConfigValue('token', token);
}

function clearToken() {
    setConfigValue('token', null);
}

function getApiUrl() {
    const config = getConfig();
    return config.apiUrl;
}

module.exports = {
    getConfig,
    saveConfig,
    setConfigValue,
    getToken,
    setToken,
    clearToken,
    getApiUrl,
    CONFIG_DIR,
    CONFIG_FILE
};
