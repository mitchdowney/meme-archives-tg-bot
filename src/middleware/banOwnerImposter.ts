import { config } from '../config'
import { banOwnerImposter as banOwnerImposterTelegramRequest, getChatId } from '../services/telegram'

export const checkIfOwnerImposter = (req) => {
  const first_name = req?.body?.message?.from?.first_name
  const last_name = req?.body?.message?.from?.last_name
  const userId = req?.body?.message?.from?.id

  console.log('[banOwnerImposter] Checking user:', {
    first_name,
    last_name,
    userId,
    OWNER_FIRST_NAME: config.OWNER_FIRST_NAME,
    OWNER_LAST_NAME: config.OWNER_LAST_NAME,
    OWNER_ID: config.OWNER_ID
  })

  const firstNameMatches =
    config.OWNER_FIRST_NAME &&
    first_name &&
    config.OWNER_FIRST_NAME.toLowerCase() === first_name.toLowerCase()

  const lastNameMatches =
    !config.OWNER_LAST_NAME ||
    (last_name && config.OWNER_LAST_NAME.toLowerCase() === last_name.toLowerCase())
  const idDoesNotMatch = config.OWNER_ID && config.OWNER_ID !== userId

  console.log('[banOwnerImposter] firstNameMatches:', firstNameMatches)
  console.log('[banOwnerImposter] lastNameMatches:', lastNameMatches)
  console.log('[banOwnerImposter] idDoesNotMatch:', idDoesNotMatch)

  if (firstNameMatches && lastNameMatches && idDoesNotMatch) {
    console.log('[banOwnerImposter] User is an owner imposter!')
    return true
  } else {
    console.log('[banOwnerImposter] User is NOT an owner imposter.')
    return false
  }
}

export const banOwnerImposter = async (req) => {
  const chat_id = getChatId(req)
  const user_id = req?.body?.message?.from?.id
  if (chat_id && user_id) {
    await banOwnerImposterTelegramRequest(chat_id, user_id)
  }
}
