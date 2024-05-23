import { Unauthorized } from 'http-errors'
import { config } from '../config'

export const checkBotAppSecretKey = (req, res, next) => {
  const secretTokenHeader = req.headers['x-telegram-bot-api-secret-token']
  const secretKey = config.BOT_APP_SECRET_KEY

  if (secretTokenHeader !== secretKey) {
    throw new Unauthorized('Invalid bot app secret key')
  }

  next()
}
