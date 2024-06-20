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

export const sendImage = async (chat_id: string, imageUrl: string, shouldCheckAndRetry?: boolean, text?: string, options?: SendMessageOptions) => {
  if (shouldCheckAndRetry) {
    for (let i = 0; i < 5; i++) {
      try {
        const response = await axios.head(imageUrl)
        if (response.status === 200) {
          break
        }
      } catch (error) {
        if (i === 4) {
          console.log('sendImage: Failed to fetch image URL after 5 attempts')
          // Unfound images should log server-side but fail silently client-side
          return
        }
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }
  }

  try {
    await telegramAPIRequest('sendPhoto', {
      params: {
        chat_id,
        photo: imageUrl,
        ...(text ? { caption: text } : {}),
        ...(options ? options : {})
      }
    })
  } catch (error) {
    console.log('sendImage telegramAPIRequest')
    console.log({
      chat_id,
      photo: imageUrl,
      ...(shouldCheckAndRetry ? { shouldCheckAndRetry } : {}),
      ...(text ? { caption: text } : {}),
      ...(options ? options : {})
    })    
  }
}

export const sendDocument = async (chat_id: string, documentUrl: string,
  caption: string, options?: SendMessageOptions) => {
  const response = await telegramAPIRequest('sendDocument',
    {
      params: { 
        chat_id,
        document: documentUrl,
        ...(caption ? { caption } : {}),
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
              { text: 'Get Image', callback_data: generateCallbackData('get_image_prompt') },
              { text: 'Upload Image', callback_data: generateCallbackData('upload_image_prompt') }
            ],
            [
              { text: 'Edit Image', callback_data: generateCallbackData('edit_image_prompt') },
              { text: 'Edit Artist', callback_data: generateCallbackData('edit_artist_prompt') }
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

type ImageFile = {
  filename: string
  buffer: Buffer
} | null

export const getImageFile = async (req: Request): Promise<ImageFile> => {
  const originalMessage = req?.body?.message
  const replyToMessage = originalMessage?.reply_to_message
  let fileId = null

  const messagesToCheck = [originalMessage, replyToMessage]

  for (const message of messagesToCheck) {
    if (message) {
      const photo = message.photo
      const document = message.document
      const video = message.video

      if (photo) {
        const largestPhoto = photo[photo.length - 1]
        fileId = largestPhoto.file_id
      }

      if (document) {
        fileId = document.file_id
      }

      if (video) {
        fileId = video.file_id
      }
    }
  }

  if (fileId === null) {
    return null
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
  commandPrefixes: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyHandlers: { [key: string]: (value: string, acc: any) => void },
  requiredKeys: string[]
) => {
  if (!keyHandlers || typeof keyHandlers !== 'object') {
    throw new Error('Key handlers object is required')
  }

  return (commandText: string) => {
    if (!commandPrefixes.some(prefix => commandText.startsWith(prefix) && commandText[prefix.length] === ' ')) {
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
  ['/upload_image', '/ui'],
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
  ['/edit_image', '/ei'],
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

export const parseEditArtistCommand = createCommandParser(
  ['/edit_artist', '/ea'],
  {
    i: (value, acc) => { acc.id = value },
    n: (value, acc) => { acc.name = value },
    s: (value, acc) => { acc.slug = value },
    deca: (value, acc) => { acc.deca_username = value },
    foundation: (value, acc) => { acc.foundation_username = value },
    instagram: (value, acc) => { acc.instagram_username = value },
    superrare: (value, acc) => { acc.superrare_username = value },
    twitter: (value, acc) => { acc.twitter_username = value }
  },
  ['id']
)

export const getCommandText = (req: Request) => {
  return req?.body?.message?.text || req?.body?.message?.caption
}

export const getChatId = (req) => {
  return req?.body?.message?.chat?.id || req?.body?.edited_message?.chat?.id || req?.body?.callback_query?.message?.chat?.id
}

export const getUserName = (req) => {
  return req?.body?.message?.from?.username || req?.body?.edited_message?.from?.username || req?.body?.callback_query?.from?.username
}

export const getMentionedUserNames = (req) => {
  const text = getCommandText(req)
  const mentionedUsers: string[] = []
  const regex = /@([a-zA-Z0-9_]+)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      mentionedUsers.push(match[1])
    }
  }

  return mentionedUsers
}
