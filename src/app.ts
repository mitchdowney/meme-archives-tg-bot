/* eslint-disable no-useless-escape */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('cors')

import * as express from 'express'
import { NextFunction, Request, Response } from 'express'
import { HttpError } from 'http-errors'
import { getUserMention, sendGalleryAdmin, sendImage, sendMessage, setWebhook } from './services/telegram'
import { checkBotAppSecretKey } from './middleware/checkTelegramSecretKey'
import { getGalleryImage } from './services/galleryAPI'
import { getAvailableImageUrl, getImageInfo } from './lib/galleryHelpers'

const port = 9000

const startApp = async () => {

  const app = express()
  app.use(express.json({
    limit: '50mb'
  }))
  app.use(express.urlencoded({
    limit: '50mb',
    extended: true
  }))

  app.use(cors())

  app.get('/', async function (req: Request, res: Response) {
    res.send('The bot is running!')
  })

  app.get('/activate', async function (req: Request, res: Response) {
    try {
      await setWebhook()
      res.send('Webhook set successfully.')
    } catch (error) {
      res.status(400)
      res.send({ message: error.message })
    }
  })

  /*
    app.get('/deactivate', async function (req: Request, res: Response) {
      try {
        await deleteWebhook()
        res.send('Webhook deleted successfully.')
      } catch (error) {
        res.status(400)
        res.send({ message: error.message })
      }
    })
  */

  app.post('/webhook',
    checkBotAppSecretKey,
    async function (req: Request, res: Response) {
      try {
        const commandText = req?.body?.message?.text
        const callbackDataObject = req.body.callback_query?.data ? JSON.parse(req.body.callback_query.data) : null
        
        if (commandText) {
          const chat_id = req?.body?.message?.chat?.id
          const username = req?.body?.message?.from?.username
          const userId = req?.body?.message?.from?.id

          if ('/gallery_hello' === commandText) {
            await webhookHandlers.galleryHello(chat_id, username, userId)
          } else if ('/gallery_admin' === commandText) {
            await webhookHandlers.galleryAdmin(chat_id)
          } else if (commandText.startsWith('/gallery_get_image')) {
            await webhookHandlers.galleryGetImage(commandText, chat_id)
          }
        } else if (callbackDataObject?.callback_data) {
          const callback_data = callbackDataObject.callback_data
          const chat_id = req?.body?.callback_query?.message?.chat?.id
          const username = req?.body?.callback_query?.from?.username
          const userId = req?.body?.callback_query?.from?.id

          if ('gallery_prompt_get_image' === callback_data) {
            await webhookHandlers.galleryPromptGetImage(chat_id)
          } else if ('gallery_prompt_upload_image' === callback_data) {
            await webhookHandlers.galleryHello(chat_id, username, userId)
          } else if ('gallery_prompt_edit_image' === callback_data) {
            await webhookHandlers.galleryHello(chat_id, username, userId)
          }
        }

        res.status(200)
        res.send()
      } catch (error) {
        res.status(200)
        res.send({ message: error?.response?.data?.description })
      }
    })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
    res.status(err.status || 500)
    res.json({
      message: err.message
    })
  })

  app.listen(port)

  console.log(`App is listening on port ${port}`)
}

(async() => {
  await startApp()
})()

const webhookHandlers = {
  galleryHello: async (chat_id: string, username = '', userId = '') => {
    const text = `Hello ${getUserMention(username, userId)}`
    await sendMessage(chat_id, text)
  },
  galleryAdmin: async (chat_id: string) => {
    await sendGalleryAdmin(chat_id)
  },
  galleryPromptGetImage: async (chat_id: string) => {
    await sendMessage(
      chat_id, 
      'type \`/gallery_get_image\` followed by the image id or path',
      { parse_mode: 'Markdown' }
    )
  },
  galleryGetImage: async (commandText: string, chat_id: string) => {
    const imageId = commandText.split(' ')[1]
    const image = await getGalleryImage(imageId)
    const imageUrl = getAvailableImageUrl('no-border', image)
    const text = getImageInfo(image)
    await sendImage(chat_id, imageUrl, text)
  }
}
