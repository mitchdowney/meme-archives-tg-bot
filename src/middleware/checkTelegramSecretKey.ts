import { Forbidden } from 'http-errors'
import { config } from '../config'

export const checkBotAppSecretKey = (req, res, next) => {
  const secretTokenHeader = req.headers['x-telegram-bot-api-secret-token']
  const secretKey = config.BOT_APP_SECRET_TOKEN

  if (secretTokenHeader !== secretKey) {
    throw new Forbidden('Permission denied. Invalid bot app secret key.')
  } else {
    next()
  }
}
