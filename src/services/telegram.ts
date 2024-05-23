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

export const sendMessage = async (chat_id: string, text: string) => {
  const response = await sendTelegramAPIRequest('/sendMessage',
    {
      params: { 
        chat_id,
        text
      }
    }
  )
  
  return response.data
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
              { text: 'Upload', callback_data: 'upload' },
              { text: 'Edit', callback_data: 'edit' }
            ]
          ]
        })
      }
    }
  )
  
  return response.data
}
