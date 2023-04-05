const fs = require('fs');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const chalk = require('chalk');
const app = express();
const { prompt } = require('./prompt.js');

const rateLimit = require('express-rate-limit');

const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each API key to 10 requests per windowMs
    message: 'You have exceeded the 10 requests per minute rate limit!', // custom error message
    keyGenerator: req => req.header('x-api-key'), // use the x-api-key header as the rate limit key
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests, please try again later.'
        });
    }
});

// Read the SSL certificate files
const privateKey = fs.readFileSync(
    '/etc/letsencrypt/live/ethanmrettinger.dev/privkey.pem',
    'utf8'
);
const certificate = fs.readFileSync(
    '/etc/letsencrypt/live/ethanmrettinger.dev/fullchain.pem',
    'utf8'
);

const credentials = {
    key: privateKey,
    cert: certificate
};

// Middleware to parse JSON payloads in POST requests
app.use(bodyParser.json());

// Path to the JSON file containing API keys
const apiKeysFile = 'apiKeys.json';

// Function to read API keys from JSON file
function readApiKeys() {
    if (fs.existsSync(apiKeysFile)) {
        const data = fs.readFileSync(apiKeysFile);
        return JSON.parse(data);
    } else {
        return [];
    }
}

// Function to update API keys in JSON file
function writeApiKeys(apiKeys) {
    fs.writeFileSync(apiKeysFile, JSON.stringify(apiKeys, null, 2));
}

// Function to validate API key and update its usage data
function validateAndUpdateApiKey(apiKey) {
    const encryptedApiKey = crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex');
    const apiKeys = readApiKeys();
    const apiKeyEntry = apiKeys.find(entry => entry.apiKey === encryptedApiKey);

    if (apiKeyEntry) {
        apiKeyEntry.calls++;
        apiKeyEntry.lastUsed = new Date();
        writeApiKeys(apiKeys);
        return true;
    } else {
        return false;
    }
}

// Route to handle POST requests with API key validation
app.post('/api', apiRateLimiter, async (req, res) => {
    const requestPrompt = req.body.prompt;
    const apiKey = req.header('x-api-key').trim().toLowerCase();

    const promptIsValid = requestPrompt && requestPrompt.length > 0;
    const keyIsValid = apiKey && apiKey.length > 0;

    if (promptIsValid && keyIsValid) {
        const isValid = validateAndUpdateApiKey(apiKey);
        console.log(`API key valid: ${isValid}`);
        if (!isValid) return res.status(401).json({ error: 'Invalid API key' });

        let response = await prompt(req.body);
        // add response.tokensUsed to the apiKeys.json file
        const apiKeys = readApiKeys();
        const encryptedApiKey = crypto
            .createHash('sha256')
            .update(apiKey)
            .digest('hex');
        const apiKeyEntry = apiKeys.find(
            entry => entry.apiKey === encryptedApiKey
        );
        apiKeyEntry.tokensGiven += response.tokensUsed;
        writeApiKeys(apiKeys);

        if (response.err) {
            res.json(response);
        } else {
            res.json(response.response);
        }
    } else {
        console.log('Invalid request');
        console.log('prompt: "', chalk.green(requestPrompt)) + '"';
        console.log('apiKey: "', chalk.blue(apiKey) + '"');
        console.log('req.body:', chalk.red(JSON.stringify(req.body, null, 2)));

        res.status(400).json({ error: 'Invalid request' });
    }
});

// test endpoint at /
app.get('/', (req, res) => {
    res.send('vscode-gpt-automate API up and running!');
});

// Create the HTTPS server
const httpsServer = https.createServer(credentials, app);

// Start the server on port 443
httpsServer.listen(443, () => {
    console.log('HTTPS server running on port 443');
});
