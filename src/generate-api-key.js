import { existsSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { v4 } from 'uuid';
import { red, green } from 'chalk';

const apiKeysFile = 'apiKeys.json';

function readApiKeys() {
    if (existsSync(apiKeysFile)) {
        const data = readFileSync(apiKeysFile);
        return JSON.parse(data);
    }
    return [];
}

function writeApiKeys(apiKeys) {
    writeFileSync(apiKeysFile, JSON.stringify(apiKeys, null, 2));
}

function generateApiKeys() {
    const apiKey = v4();
    const encryptedApiKey = createHash('sha256').update(apiKey).digest('hex');

    const isPremium = process.argv[2].toLowerCase().includes('--premium');
    // get email from args
    // check if email is valid

    // if isAdmin, give infinite tokens
    const isAdmin = process.argv[2].toLowerCase().includes('--admin');

    // check email

    const email = isPremium || isAdmin ? process.argv[3] : process.argv[2];
    if (!email.includes('@')) {
        console.log('Invalid email address:', red(email));
        return;
    }
    const premiumTokens = 7_000_000; // 7 million tokens -- $14 worth of credits ($1 profit for dev)
    const baseTokens = 2_000_000; // 2 million tokens -- $4 worth of credits ($1 profit for dev)
    const newEntry = {
        apiKey: encryptedApiKey,
        calls: 0,
        tokensUsed: 0,
        tokensGiven: isAdmin
            ? Infinity
            : isPremium
            ? premiumTokens
            : baseTokens,
        timeGiven: new Date(),
        accountType: isAdmin ? 'admin' : isPremium ? 'premium' : 'basic',
        lastUsed: null,
        gpt4Access: isPremium || isAdmin
    };

    const apiKeys = readApiKeys();
    apiKeys.push(newEntry);
    writeApiKeys(apiKeys);

    console.log('API Key generated:', green(apiKey));
}

generateApiKeys();
