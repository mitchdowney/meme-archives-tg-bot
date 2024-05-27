// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path')

import axios, { AxiosRequestConfig } from 'axios'
import { Request } from 'express'
import { config, telegramAPIBotFileUrl, telegramAPIBotUrl } from '../config'
import { configText } from '../config/configurables'

const telegramAPIRequest = async (
  path: string,
  options: AxiosRequestConfig = {}
) => {
  const url = `${telegramAPIBotUrl}/${path}`
  const response = await axios(url, {
    method: 'POST',
    ...options
  })
  return response
}

const telegramAPIFileRequest = async (
  path: string,
  options: AxiosRequestConfig = {}
) => {
  const url = `${telegramAPIBotFileUrl}/${path}`
  const response = await axios(url, {
    method: 'GET',
    ...options
  })
  return response
}

export const getChatAdministrators = async (chat_id: string) => {
  const response = await telegramAPIRequest('getChatAdministrators',
    {
      params: { 
        chat_id
      }
    }
  )

  return response.data
}

export const setWebhook = async () => {
  const secret_token = config.BOT_APP_SECRET_TOKEN
  const response = await telegramAPIRequest('setWebhook',
    {
      params: { 
        url: `${config.BOT_APP_ORIGIN}/webhook`,
        secret_token
      }
    }
  )

  return response.data
}

export const deleteWebhook = async () => {
  const response = await telegramAPIRequest('deleteWebhook')
  return response.data
}

// NOTE: underscores will break the sendMessage when parse_mode is Markdown
type SendMessageOptions = {
  parse_mode?: 'Markdown'
}

export const sendMessage = async (chat_id: string, text: string, options?: SendMessageOptions) => {
  const response = await telegramAPIRequest('sendMessage',
    {
      params: { 
        chat_id,
        text,
        ...(options ? options : {})
      }
    }
  )
  
  return response.data
}

export const sendImage = async (chat_id: string, imageUrl: string,
  text?: string, options?: SendMessageOptions) => {
  const response = await telegramAPIRequest('sendPhoto',
    {
      params: { 
        chat_id,
        photo: imageUrl,
        ...(text ? { caption: text } : {}),
        ...(options ? options : {})
      }
    }
  )

  return response.data
}

type ExtraCallbackData = {
  callback_data: string
}

const generateCallbackData = (callback_data: string, extraData?: ExtraCallbackData) => {
  const callbackData = {
    callback_data,
    ...(extraData ? extraData : {})
  }

  return JSON.stringify(callbackData)
}

export const sendGalleryAdmin = async (chat_id: string) => {
  const response = await telegramAPIRequest('sendMessage',
    {
      params: { 
        chat_id,
        text: configText.galleryAdminUIMessage,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: 'Get', callback_data: generateCallbackData('get_image_prompt') },
              { text: 'Upload', callback_data: generateCallbackData('upload_image_prompt') },
              { text: 'Edit', callback_data: generateCallbackData('upload_edit_prompt') }
            ]
          ]
        })
      }
    }
  )
  
  return response.data
}

export const getUserMention = (username = '', userId = '') => {
  return username
    ? `@${username}`
    : `[${userId}](tg://user?id=${userId})`
} 

export const getReplyToImageFile = async (req: Request) => {
  const replyToMessage = req?.body?.message?.reply_to_message
  let fileId = null

  if (replyToMessage) {
    const photo = replyToMessage.photo
    const document = replyToMessage.document

    if (photo) {
      // The photo field is an array of different sizes of the photo.
      // You can get the file_id of the largest photo like this:
      const largestPhoto = photo[photo.length - 1]
      fileId = largestPhoto.file_id
    }

    if (document) {
      // The document field contains information about the document.
      // You can get the file_id of the document like this:
      fileId = document.file_id
    }
  }

  if (fileId === null) {
    throw new Error('Image attachment not found')
  }

  const response = await telegramAPIRequest('getFile', {
    params: {
      file_id: fileId
    }
  })
  
  const filePath = response.data.result.file_path
  const filename = path.basename(filePath)
  const imageBuffer = await telegramAPIFileRequest(filePath, {
    responseType: 'arraybuffer'
  })
  return {
    filename,
    buffer: imageBuffer.data
  }
}

export const createCommandParser = (
  commandPrefix: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyHandlers: { [key: string]: (value: string, acc: any) => void },
  requiredKeys: string[]
) => {
  if (!keyHandlers || typeof keyHandlers !== 'object') {
    throw new Error('Key handlers object is required')
  }

  return (commandText: string) => {
    if (!commandText.startsWith(commandPrefix)) {
      throw new Error('Invalid command')
    }

    const parts = commandText.split(/ -(?=\w)/).slice(1)
    let parsedCommand
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsedCommand = parts.reduce((acc: any, part) => {
        const [key, ...values] = part.split(' ')
        if (acc[key]) {
          throw new Error(`Duplicate key: ${key}`)
        }
        const keyHandler = keyHandlers[key]
        if (!keyHandler) {
          throw new Error(`No handler for key: ${key}`)
        }
        keyHandler(values.join(' '), acc)
        return acc
      }, {})

      for (const key of requiredKeys) {
        if (!parsedCommand[key]) {
          throw new Error(`The "${key}" parameter is required`)
        }
      }
    } catch (error) {
      throw new Error(error)
    }

    return parsedCommand
  }
}

export const parseUploadImageCommand = createCommandParser(
  '/upload_image',
  {
    t: (value, acc) => { acc.title = value },
    ts: (value, acc) => {
      acc.tagTitles = value
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => tag.toLowerCase())
    },
    a: (value, acc) => {
      acc.artistNames = value
        .split(',')
        .map(artistName => artistName.trim())
        .filter(Boolean)
    },
    s: (value, acc) => { acc.slug = value },
  },
  []
)

export const parseEditImageCommand = createCommandParser(
  '/edit_image',
  {
    i: (value, acc) => { acc.id = value },
    t: (value, acc) => { acc.title = value },
    ts: (value, acc) => {
      acc.tagTitles = value
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => tag.toLowerCase())
    },
    a: (value, acc) => {
      acc.artistNames = value
        .split(',')
        .map(artistName => artistName.trim())
        .filter(Boolean)
    },
    s: (value, acc) => { acc.slug = value },
  },
  ['id']
)
