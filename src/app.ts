// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('cors')

import * as express from 'express'
import { Request, Response } from 'express'
import { config } from './config'
import { sendMessage, setWebhook } from './helpers/telegram'

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

  app.get('/initiate', async function (req: Request, res: Response) {
    try {
      await setWebhook(config.BOT_URL)
      res.send('Webhook set successfully.')
    } catch (error) {
      res.status(400)
      res.send({ message: error.message })
    }
  })

  app.post('/webhook', async function (req: Request, res: Response) {
    try {
      const chat_id = req?.body?.message?.chat?.id
      await sendMessage(chat_id, 'Hello from the node webhook')
      res.send('Webhook message received')
    } catch (error) {
      res.status(400)
      res.send({ message: error?.response?.data?.description })
    }
  })

  app.listen(port)

  console.log(`App is listening on port ${port}`)
}

(async() => {
  await startApp()
})()
