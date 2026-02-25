import { Request, Response, NextFunction } from 'express'
import { getDb } from '../database.js'
import NotificationService from '../services/notification-service.js'

interface TelegramFormData {
  first_name: string
  last_name: string
  address: string
  city: string
  state: string
  zip: string
  vin: string
  year: string
  make: string
  model: string
  color: string
  ins_company?: string
  policy_number?: string
  [key: string]: string | undefined // Add index signature for string keys
}

// Use the provided bot token or get it from environment variable
const TELEGRAM_BOT_TOKEN = '7664841024:AAEimwYuRvz1SI-KYERvqhlrQCLl3J2ktrc'

async function sendTelegramMessage(chatId: string | number, text: string) {
  try {
    console.log('Sending Telegram message to:', chatId)
    console.log('Message content:', text)
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Telegram API error:', error)
      throw new Error(error.description || 'Failed to send Telegram message')
    }

    console.log('Message sent successfully')
    return true
  } catch (error) {
    console.error('Failed to send Telegram message:', error)
    return false
  }
}

export class TelegramController {
  static async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('Received webhook request:', {
        method: req.method,
        headers: req.headers,
        body: req.body
      })

      const { message } = req.body
      
      if (!message || !message.text) {
        console.log('Invalid message format:', req.body)
        return res.sendStatus(400)
      }

      const chatId = message.chat.id
      console.log('Processing message from chat ID:', chatId)

      // Check if the message is a /start command
      if (message.text === '/start') {
        console.log('Handling /start command')
        await sendTelegramMessage(chatId, 
          'Welcome! 👋 I can help you create vehicle transfer documents.\n\n' +
          'Please send me the vehicle and owner information in JSON format like this:\n\n' +
          '<pre>' +
          JSON.stringify({
            first_name: "John",
            last_name: "Doe",
            address: "123 Main St",
            city: "Anytown",
            state: "CA",
            zip: "12345",
            vin: "1HGCM82633A123456",
            year: "2020",
            make: "Honda",
            model: "Civic",
            color: "Blue",
            ins_company: "State Farm",
            policy_number: "12345-67890"
          }, null, 2) +
          '</pre>'
        )
        return res.sendStatus(200)
      }

      // Parse the message text as JSON
      try {
        console.log('Attempting to parse JSON:', message.text)
        const formData: TelegramFormData = JSON.parse(message.text)
        const db = await getDb()
        
        // Validate required fields
        const requiredFields = ['first_name', 'last_name', 'address', 'city', 'state', 'zip', 'vin', 'year', 'make', 'model', 'color']
        const missingFields = requiredFields.filter(field => !formData[field])
        
        if (missingFields.length > 0) {
          console.log('Missing required fields:', missingFields)
          await sendTelegramMessage(chatId, 
            '❌ Error: Missing required fields:\n' +
            missingFields.map(field => `- ${field}`).join('\n') +
            '\n\nPlease provide all required information.'
          )
          return res.sendStatus(400)
        }

        // Validate VIN length
        if (formData.vin.length !== 17) {
          console.log('Invalid VIN length:', formData.vin)
          await sendTelegramMessage(chatId,
            '❌ Error: Invalid VIN number.\n' +
            'VIN must be exactly 17 characters long.'
          )
          return res.sendStatus(400)
        }
        
        // Transform the data to match the PDF form format
        const pdfFormData = {
          first: formData.first_name,
          last: formData.last_name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          vin1: formData.vin,
          vin2: formData.vin,
          year: formData.year,
          make1: formData.make,
          make2: formData.make,
          model1: formData.model,
          model2: formData.model,
          color: formData.color,
          ins: formData.ins_company || '',
          policy: formData.policy_number || '',
          documentName: `Vehicle Transfer - ${formData.first_name} ${formData.last_name}`,
          status: 'pending'
        }

        console.log('Storing form data:', pdfFormData)
        // Store the form data in a temporary storage
        await db.run(
          'INSERT INTO temp_form_data (chat_id, form_data) VALUES (?, ?)',
          [chatId, JSON.stringify(pdfFormData)]
        )

        // Send confirmation message with the data summary
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        await sendTelegramMessage(chatId,
          '✅ Form data received successfully!\n\n' +
          '<b>Vehicle Information:</b>\n' +
          `${formData.year} ${formData.make} ${formData.model}\n` +
          `Color: ${formData.color}\n` +
          `VIN: ${formData.vin}\n\n` +
          '<b>Owner Information:</b>\n' +
          `${formData.first_name} ${formData.last_name}\n` +
          `${formData.address}\n` +
          `${formData.city}, ${formData.state} ${formData.zip}\n\n` +
          (formData.ins_company ? 
            '<b>Insurance Information:</b>\n' +
            `Company: ${formData.ins_company}\n` +
            `Policy: ${formData.policy_number}\n\n` : '') +
          '🔗 Click the link below to open the document creation form:\n' +
          `${frontendUrl}?chat_id=${chatId}`
        )

        // Notify the frontend about new form data
        NotificationService.emit('new-form-data', {
          chatId: chatId,
          formData: pdfFormData
        })

        console.log('Successfully processed form data')
        res.sendStatus(200)
      } catch (error) {
        console.error('Error processing form data:', error)
        await sendTelegramMessage(chatId,
          '❌ Error: Invalid JSON format.\n\n' +
          'Please make sure your message is in valid JSON format and includes all required fields.\n\n' +
          'Send /start to see an example of the correct format.'
        )
        res.sendStatus(400)
      }
    } catch (error) {
      console.error('Webhook error:', error)
      next(error)
    }
  }

  static async getLatestFormData(req: Request, res: Response, next: NextFunction) {
    try {
      const { chat_id } = req.query
      console.log('Fetching form data for chat ID:', chat_id)
      
      const db = await getDb()

      if (!chat_id) {
        console.log('No chat ID provided')
        return res.status(400).json({ error: 'Chat ID is required' })
      }

      // Get the latest form data for this chat ID
      const formData = await db.get(
        'SELECT form_data FROM temp_form_data WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1',
        [chat_id]
      )

      if (!formData) {
        console.log('No form data found for chat ID:', chat_id)
        return res.status(404).json({ error: 'No form data found' })
      }

      console.log('Found form data:', formData)
      
      // Delete the temporary data after retrieving it
      await db.run('DELETE FROM temp_form_data WHERE chat_id = ?', [chat_id])
      console.log('Deleted temporary form data for chat ID:', chat_id)

      res.json({ formData: JSON.parse(formData.form_data) })
    } catch (error) {
      console.error('Error in getLatestFormData:', error)
      next(error)
    }
  }
} 