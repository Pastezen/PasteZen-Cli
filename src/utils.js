const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Get file extension language mapping
 */
function getLanguageFromExtension(filename) {
    const ext = path.extname(filename).toLowerCase().slice(1);
    const langMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'rb': 'ruby',
        'go': 'go',
        'rs': 'rust',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'cc': 'cpp',
        'h': 'c',
        'hpp': 'cpp',
        'cs': 'csharp',
        'php': 'php',
        'swift': 'swift',
        'kt': 'kotlin',
        'scala': 'scala',
        'r': 'r',
        'sql': 'sql',
        'sh': 'bash',
        'bash': 'bash',
        'zsh': 'bash',
        'ps1': 'powershell',
        'md': 'markdown',
        'json': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'less': 'less',
        'vue': 'vue',
        'svelte': 'svelte',
        'dockerfile': 'dockerfile',
        'makefile': 'makefile'
    };
    return langMap[ext] || 'text';
}

/**
 * Format paste for display
 */
function formatPaste(paste) {
    const visibility = paste.visibility === 'private'
        ? chalk.red('🔒 private')
        : chalk.green('🌐 public');

    const date = new Date(paste.createdAt).toLocaleDateString();

    return `${chalk.cyan(paste._id)} ${chalk.bold(paste.title || 'Untitled')} ${visibility} ${chalk.gray(date)}`;
}

/**
 * Format secret project for display
 */
function formatSecret(secret) {
    const visibility = secret.visibility === 'private'
        ? chalk.red('🔒 private')
        : chalk.blue('🌐 public');

    const date = new Date(secret.updatedAt).toLocaleDateString();

    return `${chalk.cyan(secret._id)} ${chalk.bold(secret.projectName)} ${visibility} ${chalk.gray(date)}`;
}

/**
 * Read file content
 */
function readFile(filePath) {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(absolutePath, 'utf8');
}

/**
 * Write file content
 */
function writeFile(filePath, content) {
    const absolutePath = path.resolve(filePath);
    fs.writeFileSync(absolutePath, content, 'utf8');
}

/**
 * Parse expiration duration to date
 */
function parseExpiration(duration) {
    if (!duration) return null;

    const match = duration.match(/^(\d+)([hdwm])$/);
    if (!match) return null;

    const [, amount, unit] = match;
    const ms = {
        'h': 60 * 60 * 1000,       // hour
        'd': 24 * 60 * 60 * 1000,  // day
        'w': 7 * 24 * 60 * 60 * 1000, // week
        'm': 30 * 24 * 60 * 60 * 1000 // month
    };

    return new Date(Date.now() + parseInt(amount) * ms[unit]);
}

/**
 * Parse KEY=value format
 */
function parseKeyValue(str) {
    const eqIndex = str.indexOf('=');
    if (eqIndex === -1) {
        throw new Error('Invalid format. Use KEY=value');
    }
    return {
        key: str.substring(0, eqIndex),
        value: str.substring(eqIndex + 1)
    };
}

/**
 * Parse .env file content
 */
function parseEnvFile(content) {
    const pairs = {};
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const { key, value } = parseKeyValue(trimmed);
        pairs[key] = value;
    }

    return pairs;
}

/**
 * Convert key-value pairs to .env format
 */
function toEnvFormat(pairs) {
    return Object.entries(pairs)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
}

module.exports = {
    getLanguageFromExtension,
    formatPaste,
    formatSecret,
    readFile,
    writeFile,
    parseExpiration,
    parseKeyValue,
    parseEnvFile,
    toEnvFormat
};
