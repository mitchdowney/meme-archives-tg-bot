import { config } from '../config'
import { banOwnerImposter as banOwnerImposterTelegramRequest, getChatId } from '../services/telegram'

export const checkIfOwnerImposter = (req) => {
  const first_name = req?.body?.message?.from?.first_name
  const last_name = req?.body?.message?.from?.last_name
  const userId = req?.body?.message?.from?.id

  const firstNameMatches =
    config.OWNER_FIRST_NAME &&
    first_name &&
    config.OWNER_FIRST_NAME.toLowerCase() === first_name.toLowerCase()

  const lastNameMatches =
    !config.OWNER_LAST_NAME ||
    (last_name && config.OWNER_LAST_NAME.toLowerCase() === last_name.toLowerCase())
  const idDoesNotMatch = config.OWNER_ID && config.OWNER_ID !== userId
  
  const bannedPrefixes = ['admin', 'developer', 'dev', 'd3v', 'owner', 'creator']
  const bannedWord = ['daumen', 'ceo']

  const otherMatches =
    (typeof first_name === 'string' &&
    bannedPrefixes.some(prefix => first_name.toLowerCase().startsWith(prefix.toLowerCase())))
    || first_name.toLowerCase() === bannedWord

  if (
    (firstNameMatches && lastNameMatches && idDoesNotMatch)
    || otherMatches
  ) {
    console.log('[banOwnerImposter] User is an owner imposter!')
    console.log('[banOwnerImposter]', {
      first_name,
      last_name,
      userId,
      OWNER_FIRST_NAME: config.OWNER_FIRST_NAME,
      OWNER_LAST_NAME: config.OWNER_LAST_NAME,
      OWNER_ID: config.OWNER_ID
    })
    return true
  } else {
    console.log('[banOwnerImposter] User is NOT an owner imposter.')
    return false
  }
}

export const banOwnerImposter = async (req) => {
  const chat_id = getChatId(req)
  const user_id = req?.body?.message?.from?.id
  const first_name = req?.body?.message?.from?.first_name
  if (chat_id && user_id) {
    await banOwnerImposterTelegramRequest(chat_id, user_id, first_name)
  }
}
