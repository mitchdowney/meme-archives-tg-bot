import { Unauthorized } from 'http-errors'
import { config } from '../config'
import { sendMessage } from '../services/telegram'

export const checkBotAppSecretKey = (req, res, next) => {
  const secretTokenHeader = req.headers['x-telegram-bot-api-secret-token']
  const secretKey = config.BOT_APP_SECRET_TOKEN

  if (secretTokenHeader !== secretKey) {
    const chat_id = req?.body?.message?.chat?.id
    if (chat_id) {
      sendMessage(chat_id, 'Permission denied.')
    }
    throw new Unauthorized('Invalid bot app secret key.')
  }

  next()
}
