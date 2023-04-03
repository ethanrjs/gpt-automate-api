const fs = require('fs');
const crypto = require('crypto');
const uuid = require('uuid');
const chalk = require('chalk');

const apiKeysFile = 'apiKeys.json';

function readApiKeys() {
    if (fs.existsSync(apiKeysFile)) {
        const data = fs.readFileSync(apiKeysFile);
        return JSON.parse(data);
    } else {
        return [];
    }
}

function writeApiKeys(apiKeys) {
    fs.writeFileSync(apiKeysFile, JSON.stringify(apiKeys, null, 2));
}

function generateApiKeys() {
    const apiKey = uuid.v4();
    const encryptedApiKey = crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex');
    const newEntry = {
        apiKey: encryptedApiKey,
        calls: 0,
        tokensGiven: 0,
        timeGiven: new Date(),
        lastUsed: null
    };

    const apiKeys = readApiKeys();
    apiKeys.push(newEntry);
    writeApiKeys(apiKeys);

    console.log('API Key generated:', chalk.green(apiKey));
}

generateApiKeys();
