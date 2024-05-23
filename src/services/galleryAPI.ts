import axios, { AxiosRequestConfig } from 'axios'
import { config } from '../config'

export const galleryAPIRequest = async (
  method: 'GET' | 'POST' = 'GET',
  path: string,
  options?: AxiosRequestConfig
) => {
  const url = `${config.GALLERY_API_ORIGIN}${path}`
  const response = await axios(url, {
    method,
    ...(options ? options : {})
  })
  return response
}

export const galleryAPIAdminRequest = async (
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

  return galleryAPIRequest(method, path, adminOptions)
}

export const getGalleryImage = async (imageId: string) => {
  const response = await galleryAPIRequest('GET', `/image/${imageId}`)
  return response.data
}
