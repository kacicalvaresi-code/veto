const express = require('express');
const axios = require('axios');
const router = express.Router();

// Mock Call Control API URL (replace with real one when available)
const CALL_CONTROL_API_URL = 'https://www.callcontrol.com/api/2014-11-01';

router.get('/reputation/:phoneNumber', async (req, res) => {
    const { phoneNumber } = req.params;

    try {
        // For MVP transparency: We forward the request but strictly WITHOUT any user-identifying headers/data
        // In a real implementation, we might rotate IP addresses or use an anonymity network 

        // Example call to external API
        // const response = await axios.get(`${CALL_CONTROL_API_URL}/Enterprise/Reputation/${phoneNumber}`, {
        //   headers: { 'ApiKey': process.env.CALL_CONTROL_API_KEY } // Server-side key, never exposed to client
        // });

        // Mock response for MVP
        const mockResponse = {
            phoneNumber: phoneNumber,
            score: Math.floor(Math.random() * 100), // Mock trust score
            tags: ['Spam', 'Telemarketer']
        };

        res.json(mockResponse);
    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(502).json({ error: 'Failed to fetch reputation data' });
    }
});

router.post('/report', async (req, res) => {
    const { phoneNumber, label } = req.body;

    // Privacy Logic: Ensure we don't log WHO reported it, just THAT it was reported.
    // We would fire-and-forget this to the upstream API.

    console.log(`[Anonymized] Report received for ${phoneNumber} as ${label}`);

    res.json({ success: true, message: 'Report submitted anonymously' });
});

module.exports = router;
