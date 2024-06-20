import { Forbidden } from 'http-errors'
import { config } from '../config'
import { getChatId } from '../services/telegram'

export const checkIsAllowedChat = (req, res, next) => {
  if (config.BOT_APP_ALLOW_ALL_GROUP_CHATS) {
    next()
  } else {
    const chat_id = getChatId(req)
    if (chat_id && config.BOT_APP_ALLOWED_GROUP_CHAT_IDS && config.BOT_APP_ALLOWED_GROUP_CHAT_IDS.includes(chat_id)) {
      next()
    } else {
      throw new Forbidden('Permission denied. Invalid chat id.')
    }
  }
}


