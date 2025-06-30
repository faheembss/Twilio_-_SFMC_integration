'use strict';

// Required modules
const express = require('express');
const path = require('path');
const jsonwebtoken = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const twilioClient = require('twilio')(accountSid, authToken);

// App setup
const app = express();
const PORT = process.env.PORT || 3000;

// --- STATIC FILE SERVING ---
// This tells Express to serve files from the current directory.
// This must come BEFORE your API routes.
app.use(express.static(path.join(__dirname)));

// Middleware to parse JSON bodies for our lifecycle routes.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * The 'execute' endpoint is special. Journey Builder sends a JWT.
 * We use express.raw() to get the raw JWT string.
 */
app.post('/execute', express.raw({ type: 'application/jwt' }), async (req, res) => {
    console.log("--- /execute endpoint hit ---");
    try {
        const jwtString = req.body.toString('utf8');
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret || jwtSecret === 'your_jwt_signing_secret_from_sfmc') {
            console.error('Execution Error: JWT_SECRET is not configured correctly in the .env file.');
            return res.status(500).json({ error: 'Server JWT secret not configured.' });
        }

        const decodedPayload = jsonwebtoken.verify(jwtString, jwtSecret);
        
        if (!decodedPayload.inArguments || !Array.isArray(decodedPayload.inArguments)) {
            console.error("Execution Error: 'inArguments' is missing or not an array in the JWT payload.");
            return res.status(400).json({ error: "'inArguments' missing or invalid." });
        }

        const inArgs = decodedPayload.inArguments.reduce((acc, curr) => ({ ...acc, ...curr }), {});

        const phoneNumber = inArgs.phoneNumber;
        const body = inArgs.customBody;
        
        if (!phoneNumber || !body) {
            console.error('Execution Error: Missing phoneNumber or customBody in payload.');
            return res.status(400).json({ error: 'Missing WhatsApp number or custom body.' });
        }

        await twilioClient.messages.create({
            from: fromWhatsAppNumber,
            to: phoneNumber,
            body: body,
        });

        console.log(`Message sent to ${phoneNumber}`);
        res.status(200).json({ success: true, message: 'WhatsApp message sent successfully' });
    } catch (err) {
        console.error('Execution Error in CATCH block:', err.message);
        if (res && typeof res.status === 'function') {
            res.status(500).json({ error: err.message });
        }
    }
});

// Add empty 200 responses for the other lifecycle endpoints to satisfy Journey Builder
app.post('/save', (req, res) => {
    console.log("--- /save endpoint hit ---");
    res.status(200).json({ success: true });
});

app.post('/publish', (req, res) => {
    console.log("--- /publish endpoint hit ---");
    res.status(200).json({ success: true });
});

app.post('/validate', (req, res) => {
    console.log("--- /validate endpoint hit ---");
    res.status(200).json({ success: true });
});

// Default route. This will now serve index.html by default if the root URL is hit.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});