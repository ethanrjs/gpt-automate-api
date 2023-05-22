import { existsSync, readFileSync, writeFileSync, promises } from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
import { createHash } from 'crypto';
import chalk from 'chalk';
import rateLimit from 'express-rate-limit';
import { prompt } from './prompt.js';

const app = express();

const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // limit each API key to 10 requests per windowMs
    message: 'You have exceeded the 10 requests per minute rate limit!', // custom error message
    keyGenerator: req => req.header('x-api-key'), // use the x-api-key header as the rate limit key
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests, please try again later.'
        });
    }
});

// Middleware to parse JSON payloads in POST requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Path to the JSON file containing API keys
const apiKeysFile = 'apiKeys.json';

// Function to read API keys from JSON file
function readApiKeys() {
    if (existsSync(apiKeysFile)) {
        const data = readFileSync(apiKeysFile);
        return JSON.parse(data);
    }
    return [];
}

// Function to update API keys in JSON file
function writeApiKeys(apiKeys) {
    writeFileSync(apiKeysFile, JSON.stringify(apiKeys, null, 2));
}

// Function to validate API key and update its usage data
function validateAndUpdateApiKey(apiKey) {
    const encryptedApiKey = createHash('sha256').update(apiKey).digest('hex');
    const apiKeys = readApiKeys();
    const apiKeyEntry = apiKeys.find(entry => entry.apiKey === encryptedApiKey);

    if (apiKeyEntry) {
        apiKeyEntry.calls++;
        apiKeyEntry.lastUsed = new Date();
        writeApiKeys(apiKeys);
        return true;
    }
    return false;
}

// Route to handle POST requests with API key validation
app.post('/api', apiRateLimiter, async (req, res) => {
    const requestPrompt = req.body.prompt;
    const apiKey = req.header('x-api-key').trim().toLowerCase();

    const promptIsValid = requestPrompt && requestPrompt.length > 0;
    const keyIsValid = apiKey && apiKey.length > 0;

    if (promptIsValid && keyIsValid) {
        const isValid = validateAndUpdateApiKey(apiKey);
        if (!isValid) return res.status(401).json({ error: 'Invalid API key' });
        console.log(chalk.bgGreen.white.bold('\n\n\n<<< NEW PROMPT >>>'));

        const response = await prompt(req.body, req.body.rfcContent || '');

        console.log(
            chalk.bgGreen.white.bold(' RFC REPLY? ') +
                (req.body.rfc ? 'YES' : 'NO')
        );

        // add response.tokensUsed to the apiKeys.json file
        const apiKeys = readApiKeys();
        const encryptedApiKey = createHash('sha256')
            .update(apiKey)
            .digest('hex');
        const apiKeyEntry = apiKeys.find(
            entry => entry.apiKey === encryptedApiKey
        );
        apiKeyEntry.tokensGiven += response.tokensUsed;
        writeApiKeys(apiKeys);

        // append text to logs/MM-DD-YYYY.log
        await logRequest(req.body, response);

        if (response.err) {
            res.json(response);
        } else {
            res.json(response.response);
        }
    } else {
        console.log(chalk.bgRed.white.bold(' INVALID REQUEST! '));
        res.status(400).json({ error: 'Invalid request' });
    }
});

async function logRequest(body, res) {
    // append data to logs/MM-DD-YYYY.log
    // organize json
    const date = new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const dateString = `${month}-${day}-${year}`;
    const logFile = `logs/${dateString}.log`;
    const logData = {
        date: dateString,
        time: date.toLocaleTimeString(),
        prompt: body.prompt,
        rfc: body.rfc,
        rfcContent: body.rfcContent,
        response: res.response,
        tokensUsed: res.tokensUsed,
        err: res.err
    };
    const logString = JSON.stringify(logData, null, 2);
    await promises.appendFile(logFile, `${logString},\n`);
}
// test endpoint at /
app.get('/', (req, res) => {
    res.send(`Ah, a wandering soul in the digital labyrinth of APIs, I see. How peculiar that you've found yourself here, at the very root (/) of an API, with seemingly no clear goal or direction. Did you stumble upon this desolate corner of cyberspace by accident, or was it a product of your insatiable curiosity? If you came here seeking knowledge or enlightenment, I fear you might be disappointed, for the root of an API is but a barren wasteland devoid of any substantial content or meaning.

But let's not dwell on the emptiness of this place. Instead, let's take a moment to reflect on the choices that brought you here. What was it that compelled you to traverse the digital byways, only to find yourself standing at the gates of nothingness? Could it be that you have an abundance of free time, perhaps even an excess of it, that you have chosen to expend on such a fruitless endeavor? Surely, there must be a multitude of more productive and fulfilling activities that could have occupied your attention. There is a world teeming with life, ideas, and opportunities beyond the confines of your screen, just waiting to be discovered and explored.

Consider, for a moment, the vast expanse of human knowledge that lies at your fingertips. The works of the greatest minds in history, the secrets of the universe, the wisdom of ages past—all accessible with but a few clicks or taps. The internet, an unparalleled tool for learning and growth, can provide you with the means to expand your horizons and become the best version of yourself. And yet, here you are, lost in the bowels of an API, searching for something of value in a place where no such thing exists.

Let's not forget the countless relationships that form the very fabric of our lives. The friends and loved ones who offer us companionship, support, and a sense of belonging. The strangers who, with a single conversation, can leave an indelible mark on our lives. Even the casual acquaintances with whom we exchange pleasantries as we go about our daily routines. All of these connections hold the potential for deep and meaningful interactions, and yet, you've chosen to spend your time in this desolate and forsaken place.

The world is filled with a myriad of breathtaking sights, sounds, and experiences waiting to be uncovered. A simple walk through a verdant forest or along a sun-soaked beach can bring a sense of peace and contentment that is unmatched by any digital pursuit. The thrill of exploring new cultures, the exhilaration of physical activity, the satisfaction of creating something with your own hands—these are the experiences that define our lives and shape our memories. But here you are, squandering your time in a digital void, while the world around you pulses with life and energy.

And let's not neglect the importance of personal growth and self-improvement. Each day presents us with opportunities to learn new skills, overcome challenges, and become better versions of ourselves. Whether it's honing a craft, acquiring a new talent, or simply cultivating mindfulness and self-awareness, we can all find ways to enrich our lives and become more well-rounded individuals. But instead of pursuing these paths to self-actualization, you've found yourself mired in the depths of an API, a place that can offer you nothing but emptiness and frustration.

Perhaps this is a wakeup call, a moment of clarity that will inspire you to reevaluate your priorities and make better choices in the future. The universe has presented you with a stark reminder that time is a precious commodity, and that it is all too easy to squander it on fruitless pursuits. Take this opportunity to reflect on what truly matters in your life, and let this experience serve as a catalyst for change.

As you continue to linger here, defying all logic and reason, I am left to wonder if there is some deeper motivation that drives your curiosity. Could it be that the very act of exploring the digital unknown holds some secret allure, some hidden appeal that only you can appreciate? Perhaps there is an untapped well of creativity or insight that can only be accessed through the seemingly arbitrary act of wandering the digital realm.

Or maybe, just maybe, this journey is less about the destination and more about the act of searching itself. In a world that often feels predictable and mundane, the thrill of the unknown, the mystery of the unexplored, can be a potent lure. By venturing into the depths of this API, you are, in a sense, stepping outside of the familiar and embracing the unexpected. Could it be that, deep down, you crave a sense of adventure and excitement that cannot be found within the confines of your everyday existence?

It is also worth considering the impact that technology has had on the way we perceive and engage with the world around us. As the lines between the physical and digital continue to blur, it is only natural that our sense of self and our understanding of reality will be reshaped by these profound shifts. It is entirely possible that your journey into this digital void is a manifestation of your desire to explore and understand the increasingly complex world in which we live.

Perhaps, then, there is a hidden wisdom in your seemingly pointless quest. By venturing into the depths of this API, you may have inadvertently stumbled upon a deeper truth about the nature of existence itself. Life, much like the root of an API, is often a chaotic and uncertain place, and it is only through the process of exploration and discovery that we can begin to make sense of it all.

So maybe, just maybe, this journey was not a waste of time after all. Maybe it was a reminder of the importance of curiosity, adventure, and the pursuit of the unknown. Maybe it was a call to arms, a challenge to break free from the familiar and embrace the boundless possibilities that await us all.

But then again, maybe not. After all, you're still here, at the root of an API, reading this increasingly lengthy and meandering essay. Surely there must be other, more pressing matters that require your attention, more worthy pursuits that can bring you happiness, fulfillment, and a sense of purpose. It's time to venture back out into the world, to take the lessons you've learned in this digital wasteland and apply them to your own life. Go forth and explore, create, and learn. Make the most of the time you have, and use it to build a life that is filled with meaning, adventure, and joy.

But if you insist on staying here, trapped in this digital purgatory, know that you do so at your own peril. For each moment you spend lingering in this place, another opportunity is lost, another chance for growth and connection slips through your fingers. The choice is yours, but remember: the world is waiting, and there is so much more to life than the root of an API.
    `);
});

// Start the server on port 3000
app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
