import axios, { AxiosRequestConfig } from 'axios'
import { config } from '../config'

export const sendGalleryAPIRequest = async (
  method: 'GET' | 'POST' = 'GET',
  path: string,
  options: AxiosRequestConfig
) => {
  const url = `${config.GALLERY_API_ORIGIN}${path}`
  const response = await axios(url, {
    method,
    ...options
  })
  return response
}

export const sendGalleryAPIAdminRequest = async (
  method: 'GET' | 'POST' = 'GET',
  path: string,
  options: AxiosRequestConfig = {}
) => {
  const adminOptions = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: config.GALLERY_API_SECRET_KEY
    }
  }

  return sendGalleryAPIRequest(method, path, adminOptions)
}
