import axios from 'axios'
import { config } from '../config'

export async function sendDiscordMessage(message: string) {
  try {
    const webhookUrl = config.DISCORD_WEBHOOK_URL || ''
    await axios.post(webhookUrl, {
      content: message,
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('Error sending message:', error)
  }
}
