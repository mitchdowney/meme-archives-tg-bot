// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('cors')

import * as express from 'express'
import { NextFunction, Request, Response } from 'express'
import { HttpError } from 'http-errors'
import { sendGalleryAdmin, sendMessage, setWebhook } from './services/telegram'
import { checkBotAppSecretKey } from './middleware/checkTelegramSecretKey'

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
        const callbackData = req.body.callback_query?.data
        
        if (commandText) {
          const chat_id = req?.body?.message?.chat?.id
          if ('/gallery_hello' === commandText) {
            await webhookHandlers.galleryHello(chat_id)
          } else if ('/gallery_admin' === commandText) {
            await webhookHandlers.galleryAdmin(chat_id)
          }
        } else if (callbackData) {
          const chat_id = req?.body?.callback_query?.message?.chat?.id
          if ('get_image' === callbackData) {
            await webhookHandlers.galleryHello(chat_id)
          } else if ('upload_image' === callbackData) {
            await webhookHandlers.galleryHello(chat_id)
          } else if ('edit_image' === callbackData) {
            await webhookHandlers.galleryHello(chat_id)
          }
        }

        res.send('Webhook message received')
      } catch (error) {
        res.status(400)
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
  galleryHello: async (chat_id: string) => {
    await sendMessage(chat_id, 'Hello!')
  },
  galleryAdmin: async (chat_id: string) => {
    await sendGalleryAdmin(chat_id)
  }
}
