import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const port = 3003;  // This matches the API_URL in telegram_bot.py

// In-memory storage for form data (you might want to use a database in production)
const formDataStore = new Map();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Telegram webhook endpoint
app.post('/api/telegram/webhook', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.chat || !message.text) {
            return res.status(400).json({ error: 'Invalid message format' });
        }

        const chatId = message.chat.id;
        const formData = JSON.parse(message.text);
        
        // Store the form data with the chat_id as key
        formDataStore.set(chatId.toString(), formData);
        console.log('Stored form data for chat_id:', chatId);
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to retrieve form data by chat_id
app.get('/api/telegram/form-data/:chatId', (req, res) => {
    const { chatId } = req.params;
    const formData = formDataStore.get(chatId);
    
    if (!formData) {
        return res.status(404).json({ error: 'Form data not found' });
    }
    
    res.json(formData);
});

app.listen(port, () => {
    console.log(`Telegram server listening at http://localhost:${port}`);
}); 