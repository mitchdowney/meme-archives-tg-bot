import axios, { AxiosRequestConfig } from 'axios'
import { telegramAPIBotUrl } from '../config'

const sendTelegramAPIRequest = async (
  path: string,
  options: AxiosRequestConfig
) => {
  const url = `${telegramAPIBotUrl}${path}`
  const response = await axios(url, options)
  return response
}

export const setWebhook = async (webhookUrl: string) => {
  const response = await sendTelegramAPIRequest('/setWebhook',
    {
      params: { 
        url: webhookUrl
      }
    }
  )

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
