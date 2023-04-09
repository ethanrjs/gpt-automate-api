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

function addTokens(apiKey, tokens) {
    const encryptedApiKey = crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex');
    const apiKeys = readApiKeys();
    const apiKeyEntry = apiKeys.find(entry => entry.apiKey === encryptedApiKey);

    if (apiKeyEntry) {
        apiKeyEntry.tokens += tokens;
        writeApiKeys(apiKeys);
        return true;
    } else {
        return false;
    }
}

function generateApiKeys() {
    const apiKey = uuid.v4();
    const encryptedApiKey = crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex');

    const isPremium = process.argv[2].toLowerCase().includes('premium');
    // if process.argv[2] lowercase contains "premium" set "gpt4Access" to true
    // GPT-4 tokens are 30x more expensive than GPT-3 tokens
    // $0.06 per GPT-4 | $0.002 per GPT-3
    // For $5, you get 250,000 GPT-3 tokens (base plan)
    // For $15, you get 7,500,000 GPT-4 tokens (premium plan)

    const premiumTokens = 7_000_000; // 7 million tokens -- $14 worth of credits ($1 profit for dev)
    const baseTokens = 2_000_000; // 2 million tokens -- $4 worth of credits ($1 profit for dev)
    const newEntry = {
        apiKey: encryptedApiKey,
        calls: 0,
        tokensUsed: 0,
        tokensGiven: isPremium ? premiumTokens : baseTokens,
        timeGiven: new Date(),
        lastUsed: null,
        gpt4Access: isPremium
    };

    const apiKeys = readApiKeys();
    apiKeys.push(newEntry);
    writeApiKeys(apiKeys);

    console.log('API Key generated:', chalk.green(apiKey));
}

generateApiKeys();
