const axios = require('axios');
const { getToken, getApiUrl } = require('./config');
const chalk = require('chalk');

function getClient() {
    const token = getToken();
    const apiUrl = getApiUrl();

    if (!token) {
        console.log(chalk.red('Error: Not authenticated. Run `pz auth token <TOKEN>` first.'));
        process.exit(1);
    }

    return axios.create({
        baseURL: apiUrl,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
}

// Paste API
async function createPaste(data) {
    const client = getClient();
    const response = await client.post('/api/pastes', data);
    return response.data;
}

async function listPastes() {
    const client = getClient();
    const response = await client.get('/api/pastes');
    return response.data;
}

async function getPaste(id, password = null) {
    const client = getClient();

    try {
        const response = await client.get(`/api/pastes/${id}`);
        return response.data;
    } catch (error) {
        if (error.response?.status === 403 && password) {
            // Try to unlock with password
            const unlockResponse = await client.post(`/api/pastes/${id}/unlock`, { password });
            return unlockResponse.data;
        }
        throw error;
    }
}

async function deletePaste(id) {
    const client = getClient();
    const response = await client.delete(`/api/pastes/${id}`);
    return response.data;
}

async function executePaste(id, input = '') {
    const client = getClient();
    const response = await client.post(`/api/pastes/${id}/execute`, { input });
    return response.data;
}

// Secrets API
async function listSecrets() {
    const client = getClient();
    const response = await client.get('/api/secrets');
    return response.data;
}

async function createSecret(data) {
    const client = getClient();
    const response = await client.post('/api/secrets', data);
    return response.data;
}

async function getSecret(id, password = null) {
    const client = getClient();

    try {
        const response = await client.get(`/api/secrets/${id}`);
        return response.data;
    } catch (error) {
        if (error.response?.status === 403 && password) {
            // Try to unlock with password
            const unlockResponse = await client.post(`/api/secrets/${id}/unlock`, { password });
            return unlockResponse.data;
        }
        throw error;
    }
}

async function updateSecret(id, data) {
    const client = getClient();
    const response = await client.put(`/api/secrets/${id}`, data);
    return response.data;
}

async function deleteSecret(id) {
    const client = getClient();
    const response = await client.delete(`/api/secrets/${id}`);
    return response.data;
}

// Pastebox API
async function createPastebox(data) {
    const client = getClient();
    const response = await client.post('/api/pasteboxes', data);
    return response.data;
}

async function listPasteboxes() {
    const client = getClient();
    const response = await client.get('/api/pasteboxes');
    return response.data;
}

async function getPastebox(id) {
    const client = getClient();
    const response = await client.get(`/api/pasteboxes/${id}`);
    return response.data;
}

async function deletePastebox(id) {
    const client = getClient();
    const response = await client.delete(`/api/pasteboxes/${id}`);
    return response.data;
}

async function listPasteboxFiles(id, path = '/') {
    const client = getClient();
    const response = await client.get(`/api/pasteboxes/${id}/files`, { params: { path } });
    return response.data;
}

async function uploadPasteboxFile(id, filePath, content) {
    const client = getClient();
    const response = await client.post(`/api/pasteboxes/${id}/files`, { path: filePath, content, encoding: 'base64' });
    return response.data;
}

async function downloadPasteboxFile(id, filePath) {
    const client = getClient();
    const response = await client.get(`/api/pasteboxes/${id}/files/${encodeURIComponent(filePath)}`);
    return response.data;
}

async function injectPasteboxSecrets(id, secrets) {
    const client = getClient();
    const response = await client.post(`/api/pasteboxes/${id}/secrets`, { secrets });
    return response.data;
}

async function listPasteboxSecrets(id) {
    const client = getClient();
    const response = await client.get(`/api/pasteboxes/${id}/secrets`);
    return response.data;
}

module.exports = {
    getClient,
    createPaste,
    listPastes,
    getPaste,
    deletePaste,
    executePaste,
    listSecrets,
    createSecret,
    getSecret,
    updateSecret,
    deleteSecret,
    // Pastebox
    createPastebox,
    listPasteboxes,
    getPastebox,
    deletePastebox,
    listPasteboxFiles,
    uploadPasteboxFile,
    downloadPasteboxFile,
    injectPasteboxSecrets,
    listPasteboxSecrets
};

