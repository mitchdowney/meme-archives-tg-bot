/* eslint-disable no-useless-escape */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('cors')

import * as express from 'express'
import { NextFunction, Request, Response } from 'express'
import { HttpError } from 'http-errors'
import { getReplyToImageFile, getUserMention, parseEditImageCommand, parseUploadImageCommand, sendGalleryAdmin, sendImage, sendMessage, setWebhook } from './services/telegram'
import { checkBotAppSecretKey } from './middleware/checkTelegramSecretKey'
import { galleryEditImage, galleryGetImage, galleryUploadImage } from './services/galleryAPI'
import { getArtistNames, getAvailableImageUrl, getImageInfo, getTagTitles } from './lib/galleryHelpers'
import { checkIsGroupAdmin } from './services/checkIsGroupAdmin'

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
          if ('/gallery_hello' === commandText) {
            await webhookHandlers.galleryHello(req)
          } else if ('/gallery_admin' === commandText) {
            await webhookHandlers.galleryAdmin(req)
          } else if (commandText.startsWith('/get_image')) {
            await webhookHandlers.getImage(req)
          } else if (commandText.startsWith('/upload_image')) {
            await webhookHandlers.uploadImage(req)
          } else if (commandText.startsWith('/edit_image')) {
            await webhookHandlers.editImage(req)
          }
        } else if (callbackDataObject?.callback_data) {
          const callback_data = callbackDataObject.callback_data
          if ('get_image_prompt' === callback_data) {
            await webhookHandlers.getImagePrompt(req)
          } else if ('upload_image_prompt' === callback_data) {
            await webhookHandlers.uploadImagePrompt(req)
          } else if ('upload_edit_prompt' === callback_data) {
            await webhookHandlers.editImagePrompt(req)
          }
        }

        res.status(200)
        res.send()
      } catch (error) {
        const chat_id = req?.body?.message?.chat?.id
          ? req.body.message.chat.id
          : req.body.callback_query.message.chat.id
        const errorMessage = error?.response?.data?.message
          ? error.response.data.message
          : error?.message
        await sendMessage(chat_id, errorMessage)
        res.status(200)
        res.send()
      }
    })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(err)
    }

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
  galleryHello: async (req: Request) => {
    const chat_id = req?.body?.message?.chat?.id
    const username = req?.body?.message?.from?.username
    const userId = req?.body?.message?.from?.id
    const text = `Hello ${getUserMention(username, userId)}`
    await sendMessage(chat_id, text)
  },
  galleryAdmin: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const chat_id = req?.body?.message?.chat?.id
    await sendGalleryAdmin(chat_id)
  },
  getImagePrompt: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const chat_id = req?.body?.callback_query?.message?.chat?.id
    await sendMessage(
      chat_id, 
      'GET: type \`/get_image\` followed by the image id or slug',
      { parse_mode: 'Markdown' }
    )
  },
  uploadImagePrompt: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const chat_id = req?.body?.callback_query?.message?.chat?.id
    await sendMessage(
      chat_id, 
      'UPLOAD: reply to a file or message, then type \`/upload_image\` with the following optional parameters:\n-t title\n-ts tags,separated,by,comma\n-a artists,separated,by,comma\n-p url-slug',
      { parse_mode: 'Markdown' }
    )
  },
  editImagePrompt: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const chat_id = req?.body?.callback_query?.message?.chat?.id
    await sendMessage(
      chat_id, 
      'EDIT: type \`/edit_image\` with the following required parameter:\n-i id-or-slug\noptional parameters:\n-t title\n-ts tags,separated,by,comma\n-a artists,separated,by,comma\n-p url-slug',
      { parse_mode: 'Markdown' }
    )
  },
  getImage: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const commandText = req?.body?.message?.text
    const chat_id = req?.body?.message?.chat?.id
    const imageId = commandText.split(' ')[1]
    const image = await galleryGetImage(imageId)
    const imageUrl = getAvailableImageUrl('no-border', image)
    const text = getImageInfo(image)
    await sendImage(chat_id, imageUrl, text)
  },
  uploadImage: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const commandText = req?.body?.message?.text
    const chat_id = req?.body?.message?.chat?.id
    const parsedCommand = parseUploadImageCommand(commandText)
    const imageUploadData = await getReplyToImageFile(req)
  
    const { title, tagTitles, artistNames, slug } = parsedCommand
    
    const image = await galleryUploadImage({
      title,
      tagTitles,
      artistNames,
      slug,
      imageUploadData
    })

    const imageUrl = getAvailableImageUrl('no-border', image)
    const text = getImageInfo(image)
    if (imageUrl) {
      await sendImage(chat_id, imageUrl, text)
    } else {
      await sendMessage(chat_id, text)
    }
  },
  editImage: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const commandText = req?.body?.message?.text
    const chat_id = req?.body?.message?.chat?.id
    const parsedCommand = parseEditImageCommand(commandText)
    const imageUploadData = await getReplyToImageFile(req)
  
    const { id: idOrSlug, title, tagTitles, artistNames, slug } = parsedCommand
    
    const previousImageData = await galleryGetImage(idOrSlug)

    const previousTagTitles = previousImageData.tags?.map(tag => tag.title)
    const previousArtistNames = previousImageData.artists?.map(artist => artist.name)

    const image = await galleryEditImage(previousImageData.id, {
      ...previousImageData,
      ...(title ? { title } : {}),
      ...(tagTitles?.length ? { tagTitles } : { tagTitles: previousTagTitles }),
      ...(artistNames?.length ? { artistNames } : { artistNames: previousArtistNames}),
      ...(slug ? { slug } : {}),
      imageUploadData
    })

    const imageUrl = getAvailableImageUrl('no-border', image)
    const text = getImageInfo(image)
    if (imageUrl) {
      await sendImage(chat_id, imageUrl, text)
    } else {
      await sendMessage(chat_id, text)
    }
  }
}
