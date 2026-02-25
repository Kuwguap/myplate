import { TelegramService } from '../services/telegram.service.js';
// In-memory storage for form data (you might want to use a database in production)
const formDataStore = new Map();
export const handleWebhook = async (req, res) => {
    try {
        const { message } = req.body;
        console.log('Received webhook data:', req.body); // Add logging
        if (!message || !message.chat || !message.text) {
            return res.status(400).json({ error: 'Invalid webhook data' });
        }
        const chatId = message.chat.id.toString();
        try {
            // Parse the JSON data from the message
            const formData = JSON.parse(message.text);
            console.log('Parsed form data:', formData); // Add logging
            // Store the form data with the chat ID
            TelegramService.storeFormData(chatId, formData);
            res.status(200).json({ success: true });
        }
        catch (error) {
            console.error('Error parsing JSON:', error);
            res.status(400).json({ error: 'Invalid JSON format' });
        }
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
export const getFormData = async (req, res) => {
    try {
        const chatId = req.query.chat_id?.toString();
        console.log('Getting form data for chat ID:', chatId); // Add logging
        if (!chatId) {
            return res.status(400).json({ error: 'chat_id is required' });
        }
        const formData = TelegramService.getFormData(chatId);
        console.log('Retrieved form data:', formData); // Add logging
        if (!formData) {
            return res.status(404).json({ error: 'No form data found for this chat ID' });
        }
        // Clear the data after retrieving it
        TelegramService.deleteFormData(chatId);
        res.status(200).json({ formData });
    }
    catch (error) {
        console.error('Error retrieving form data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
