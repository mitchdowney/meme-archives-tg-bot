import { Forbidden } from 'http-errors'
import { config } from '../config'
import { getChatId } from '../services/telegram'

export const checkIsAllowedUser = (req, res, next) => {
  const chat_id = getChatId(req)
  if (chat_id && config.BOT_APP_ALLOWED_USER_IDS && config.BOT_APP_ALLOWED_USER_IDS.includes(chat_id)) {
    next()
  } else {
    throw new Forbidden('Permission denied. Invalid chat id.')
  }
}
