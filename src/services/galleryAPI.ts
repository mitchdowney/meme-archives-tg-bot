import axios, { AxiosRequestConfig } from 'axios'
import { config } from '../config'
import FormData = require('form-data')

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

export const galleryGetImage = async (imageId: string) => {
  const response = await galleryAPIRequest('GET', `/image/${imageId}`)
  return response.data
}

type GalleryUploadImage = {
  title: string
  tagTitles: string
  artistNames: string
  slug: string
  imageUploadData: {
    filename: string
    buffer: Buffer
  }
}

const getContentTypeFromFilename = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (extension === 'png') {
    return 'image/png'
  } else if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg'
  } else if (extension === 'gif') {
    return 'image/gif'
  } else {
    throw new Error('Invalid image border file type. Expected a png, jpg, jpeg, or gif file.')
  }
}

const createImageFormData = (data: GalleryUploadImage, id?: number) => {
  const filteredData = {
    id,
    title: data.title,
    tagTitles: JSON.stringify(data.tagTitles || []),
    artistNames: JSON.stringify(data.artistNames || []),
    slug: data.slug,
    prevent_border_image: config.GALLERY_IMAGE_PREVENT_BORDER_IMAGE,
    preview_crop_position: config.GALLERY_IMAGE_PREVIEW_CROP_POSITION
  }

  const formData = new FormData()
  for (const key in filteredData) {
    if (filteredData[key] || filteredData[key] === '' || filteredData[key] === null) {
      formData.append(key, filteredData[key])
    }
  }

  const contentType = getContentTypeFromFilename(data.imageUploadData.filename)

  if (contentType === 'image/gif') {
    formData.append('fileImageAnimations', data.imageUploadData.buffer, {
      filename: data.imageUploadData.filename,
      contentType
    })
  } else if (contentType === 'image/png' || contentType === 'image/jpeg') {
    formData.append('fileImageNoBorders', data.imageUploadData.buffer, {
      filename: data.imageUploadData.filename,
      contentType
    })
  }

  return formData
}

export const galleryUploadImage = async (data: GalleryUploadImage) => {  
  const formData = createImageFormData(data)

  const response = await galleryAPIAdminRequest('POST', '/image', {
    headers: {
      ...formData.getHeaders()
    },
    data: formData
  })

  return response.data
}

export const galleryEditImage = async (id: number, data: GalleryUploadImage) => {  
  const formData = createImageFormData(data, id)

  const response = await galleryAPIAdminRequest('POST', '/image/update', {
    headers: {
      ...formData.getHeaders()
    },
    data: formData
  })

  return response.data
}
