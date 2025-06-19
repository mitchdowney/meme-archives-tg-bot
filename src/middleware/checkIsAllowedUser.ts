import { Forbidden } from 'http-errors'
import { config } from '../config'
import { getUserName } from '../services/telegram'

export const checkIsAllowedUser = (req) => {
  const username = getUserName(req)
  if (
    username
    && config.BOT_APP_ALLOWED_USERNAMES
    && config.BOT_APP_ALLOWED_USERNAMES.includes(username)) {
    return true
  } else if (
    !config.BOT_APP_ALLOWED_USERNAMES
    || config.BOT_APP_ALLOWED_USERNAMES?.length === 0) {
    return true
  } else {
    throw new Forbidden('Permission denied. Invalid username.')
  }
}
