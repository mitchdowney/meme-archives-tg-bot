// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FormData = require('form-data')

import axios, { AxiosRequestConfig } from 'axios'
import { Request } from 'express'

import { config, telegramAPIBotFileUrl, telegramAPIBotUrl } from '../config'
import { configText } from '../config/configurables'
import { downloadImageAsBuffer, galleryCreateTelegramVideoFile, galleryGetImage, galleryGetTelegramVideoFile, galleryUpdateTelegramVideoFile } from './galleryAPI'

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

export const sendImage = async (chat_id: string, imageUrl: string, shouldCheckAndRetry?: boolean,
  text?: string, has_spoiler = false, options?: SendMessageOptions) => {
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
        ...(options ? options : {}),
        has_spoiler
      }
    })
  } catch (error) {
    console.log('sendImage telegramAPIRequest')
    console.log({
      chat_id,
      photo: imageUrl,
      ...(shouldCheckAndRetry ? { shouldCheckAndRetry } : {}),
      ...(text ? { caption: text } : {}),
      ...(options ? options : {}),
      has_spoiler
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

export const extractRepliedUsername = (req: Request): string | null => {
  const message = req.body.message
  
  if (message && message.reply_to_message && message.reply_to_message.from) {
    return message.reply_to_message.from.username || null
  }
  
  return null
}

export const getUserMention = (username = '', userId = '') => {
  return username
    ? `@${username}`
    : `[${userId}](tg://user?id=${userId})`
}

export const uploadAndSendVideoFromCache = async (chat_id: string, image_id: number) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let telegramVideoFile: any = null
  let videoInCache = true
  try {
    telegramVideoFile = await galleryGetTelegramVideoFile(chat_id, image_id)
    videoInCache = await checkVideoInCache(telegramVideoFile.telegram_cached_file_id)
  } catch (error) {
    console.error(error.response?.data || error.message)
  }
  
  if (telegramVideoFile && videoInCache) {
    await sendVideoFromCache(chat_id, telegramVideoFile.telegram_cached_file_id)
  } else {
    const image = await galleryGetImage(image_id.toString())
    if (image.has_video) {
      const videoUrl = `${config.GALLERY_IMAGE_BUCKET_ORIGIN}/${image_id}-video.mp4`
      const videoBuffer = await downloadImageAsBuffer(videoUrl)
      const videoPath = `/tmp/${image_id}-video.mp4`
      fs.writeFileSync(videoPath, videoBuffer)
      
      const telegram_cached_file_id = await uploadVideoToCache(chat_id, videoPath)
      
      if (!videoInCache) {
        await galleryCreateTelegramVideoFile(chat_id, image_id, telegram_cached_file_id)
      } else {
        await galleryUpdateTelegramVideoFile(chat_id, image_id, telegram_cached_file_id)
      }

      await sendVideoFromCache(chat_id, telegram_cached_file_id)
    } else if (image.has_animation) {
      const animationUrl = `${config.GALLERY_IMAGE_BUCKET_ORIGIN}/${image_id}-animation.gif`
      const animationBuffer = await downloadImageAsBuffer(animationUrl)
      const animationPath = `/tmp/${image_id}-animation.gif`
      fs.writeFileSync(animationPath, animationBuffer)
      
      const telegram_cached_file_id = await uploadVideoToCache(chat_id, animationPath)

      if (!videoInCache) {
        await galleryCreateTelegramVideoFile(chat_id, image_id, telegram_cached_file_id)
      } else {
        await galleryUpdateTelegramVideoFile(chat_id, image_id, telegram_cached_file_id)
      }

      await sendVideoFromCache(chat_id, telegram_cached_file_id)
    }
  }
}

const uploadVideoToCache = async (chat_id: string, videoPath: string): Promise<string> => {
  const formData = new FormData()
  formData.append('chat_id', chat_id)
  formData.append('video', fs.createReadStream(videoPath))
  formData.append('disable_notification', 'true')

  try {
    const response = await telegramAPIRequest('sendVideo', {
      data: formData,
      headers: {
        ...formData.getHeaders()
      }
    })
    const fileId = response.data.result.video.file_id
    console.log(`Video uploaded to cache successfully, file_id: ${fileId}`)
    return fileId
  } catch (error) {
    console.log('videoPath', videoPath)
    console.error('Failed to upload video to cache:', error.response?.data || error.message)
    throw error
  }
}

export const checkVideoInCache = async (file_id: string): Promise<boolean> => {
  try {
    const response = await telegramAPIRequest('getFile', {
      data: { file_id },
      headers: { 'Content-Type': 'application/json' }
    })

    if (response.data.ok) {
      console.log(`File exists in cache: ${file_id}`)
      return true
    } else {
      console.log(`File does not exist in cache: ${file_id}`)
      return false
    }
  } catch (error) {
    console.error(`Error checking file in cache: ${file_id}`, error.response?.data || error.message)
    return false
  }
}

const sendVideoFromCache = async (chat_id: string, file_id: string): Promise<void> => {
  const formData = new FormData()
  formData.append('chat_id', chat_id)
  formData.append('video', file_id)

  try {
    const response = await telegramAPIRequest('sendVideo', {
      data: formData,
      headers: {
        ...formData.getHeaders()
      }
    })
    console.log(`Video sent successfully to chat ${chat_id}`, response.data)
  } catch (error) {
    console.log('video fileId', file_id)
    console.error(`Failed to send video to chat ${chat_id}:`, error.response?.data || error.message)
  }
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
    const commandPosition = commandPrefixes
      .map(prefix => commandText.indexOf(prefix + ' '))
      .find(position => position !== -1)

    if (commandPosition === undefined) {
      throw new Error('Invalid command')
    }

    const parts = commandText.substring(commandPosition).split(/ -(?=\w)/).slice(1)

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
    pb: (value, acc) => { acc.prevent_border_image = (value === 'true' || value === 't') },
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
    pb: (value, acc) => { acc.prevent_border_image = (value === 'true' || value === 't') },
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
