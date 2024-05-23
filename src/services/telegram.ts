import axios, { AxiosRequestConfig } from 'axios'
import { config, telegramAPIBotUrl } from '../config'
import { configText } from '../config/configurables'

const sendTelegramAPIRequest = async (
  path: string,
  options: AxiosRequestConfig = {}
) => {
  const url = `${telegramAPIBotUrl}${path}`
  const response = await axios(url, {
    method: 'POST',
    ...options
  })
  return response
}

export const getChatAdministrators = async (chat_id: string) => {
  const response = await sendTelegramAPIRequest('/getChatAdministrators',
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
  const response = await sendTelegramAPIRequest('/setWebhook',
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
  const response = await sendTelegramAPIRequest('/deleteWebhook')
  return response.data
}


// NOTE: underscores will break the sendMessage when parse_mode is Markdown
type SendMessageOptions = {
  parse_mode?: 'Markdown'
}

export const sendMessage = async (chat_id: string, text: string, options?: SendMessageOptions) => {
  const response = await sendTelegramAPIRequest('/sendMessage',
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
  text: string, options?: SendMessageOptions) => {
  const response = await sendTelegramAPIRequest('/sendPhoto',
    {
      params: { 
        chat_id,
        photo: imageUrl,
        caption: text,
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
  const response = await sendTelegramAPIRequest('/sendMessage',
    {
      params: { 
        chat_id,
        text: configText.galleryAdminUIMessage,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: 'Get', callback_data: generateCallbackData('gallery_prompt_get_image') },
              { text: 'Upload', callback_data: generateCallbackData('gallery_prompt_upload_image') },
              { text: 'Edit', callback_data: generateCallbackData('gallery_prompt_edit_image') }
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
