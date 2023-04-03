const axios = require('axios');

async function sendPostRequest() {
    const apiKey = 'b2120482-875f-4923-b550-2f15e6199e1c';
    const prompt = 'Hello there!';

    try {
        const response = await axios.post(
            'https://ethanmrettinger.dev/api',
            { prompt: prompt },
            {
                headers: {
                    'x-api-key': apiKey
                }
            }
        );

        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error);
    }
}

sendPostRequest();
