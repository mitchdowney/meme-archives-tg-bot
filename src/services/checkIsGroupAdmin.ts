import { Request } from 'express'
import { getChatAdministrators } from './telegram'
import createHttpError = require('http-errors')

export const checkIsGroupAdmin = (req: Request) => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<void>(async (resolve, reject) => {
    try {
      const chatId = req?.body?.message?.chat?.id
        ? req.body.message.chat.id
        : req.body.callback_query.message.chat.id
      const userId = req?.body?.message?.from?.id
        ? req.body.message.from.id
        : req.body.callback_query.from.id

      const chatAdminsData = await getChatAdministrators(chatId)

      const admins = chatAdminsData.result
      const isAdmin = admins.some(admin => admin.user.id === userId)

      if (!isAdmin) {
        resolve()
      } else {
        const errorMessage = 'You must be an admin to use this command.'
        reject(createHttpError(401, errorMessage))
      }
    } catch (error) {
      const errorMessage = 'An error occurred while checking admin status.'
      reject(createHttpError(401, errorMessage))
    }
  })
}
