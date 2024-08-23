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

export const galleryGetRandomImage = async (title?: string) => {
  const response = await galleryAPIRequest(
    'GET', 
    '/image/get-one-random',
    {
      params: {
        ...(title ? { title } : {})
      }
    }
  )
  return response.data
}

export const galleryGetImagesByArtist = async (artistSlug: string, total: number, sort: string) => {
  const artist = await galleryGetArtist(artistSlug)

  if (!artist) {
    return []
  }

  const response = await galleryAPIRequest(
    'GET', 
    '/images/by-artist',
    {
      params: {
        id: artist.id,
        page: 1,
        sort
      }
    }
  )

  const images = response.data?.[0] || []
  const finalImages = images.slice(0, total)

  return finalImages
}

type GalleryUploadImage = {
  title?: string
  tagTitles?: string
  artistNames?: string
  slug?: string
  imageUploadData: {
    filename: string
    buffer: Buffer
  } | null
  prevent_border_image?: boolean
}

const getContentTypeFromFilename = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (extension === 'mp4') {
    return 'video/mp4'
  } else if (extension === 'png') {
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
    prevent_border_image: data.prevent_border_image ? 'true' : config.GALLERY_IMAGE_PREVENT_BORDER_IMAGE,
    preview_crop_position: config.GALLERY_IMAGE_PREVIEW_CROP_POSITION
  }

  const formData = new FormData()
  for (const key in filteredData) {
    if (filteredData[key] || filteredData[key] === '') {
      formData.append(key, filteredData[key])
    }
  }

  if (data?.imageUploadData?.filename && data?.imageUploadData?.buffer) {
    const contentType = getContentTypeFromFilename(data?.imageUploadData?.filename)
  
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
    } else if (contentType === 'video/mp4') {
      formData.append('fileImageVideos', data.imageUploadData.buffer, {
        filename: data.imageUploadData.filename,
        contentType
      })
    }
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

export const galleryGetTelegramVideoFile = async (bot_user_name: string, image_id: number) => {  
  const response = await galleryAPIAdminRequest('GET', `/telegram-video-file/${bot_user_name}/${image_id}`)
  return response.data
}

export const galleryCreateTelegramVideoFile = async (telegram_bot_user_name: string, image_id: number, telegram_cached_file_id: string) => {
  const response = await galleryAPIAdminRequest('POST', '/telegram-video-file', {
    data: {
      telegram_bot_user_name,
      image_id,
      telegram_cached_file_id
    }
  })

  return response.data
}

export const galleryGetArtist = async (artistId: string) => {
  const response = await galleryAPIRequest('GET', `/artist/${artistId}`)
  return response.data
}

export const galleryGetAllTagsWithImages = async () => {
  const response = await galleryAPIRequest('GET', '/tags/all-with-images')
  return response.data
}

type GalleryUpdateArtist = {
  name?: string
  slug?: string
  deca_username?: string
  foundation_username?: string
  instagram_username?: string
  superrare_username?: string
  twitter_username?: string
  imageUploadData: {
    filename: string
    buffer: Buffer
  } | null
}

const updateArtistFormData = (data: GalleryUpdateArtist, id: number) => {
  const filteredData = {
    id,
    name: data.name,
    slug: data.slug,
    deca_username: data.deca_username,
    foundation_username: data.foundation_username,
    instagram_username: data.instagram_username,
    superrare_username: data.superrare_username,
    twitter_username: data.twitter_username
  }

  const formData = new FormData()
  for (const key in filteredData) {
    if (filteredData[key] || filteredData[key] === '') {
      formData.append(key, filteredData[key])
    }
  }

  if (data?.imageUploadData?.filename && data?.imageUploadData?.buffer) {
    const contentType = getContentTypeFromFilename(data.imageUploadData.filename)
  
    if (contentType === 'image/png' || contentType === 'image/jpeg') {
      formData.append('fileArtistProfilePictures', data.imageUploadData.buffer, {
        filename: data.imageUploadData.filename,
        contentType
      })
    }
  }

  return formData
}

export const galleryEditArtist = async (id: number, data: GalleryUpdateArtist) => {  
  const formData = updateArtistFormData(data, id)

  const response = await galleryAPIAdminRequest('POST', '/artist/update', {
    headers: {
      ...formData.getHeaders()
    },
    data: formData
  })

  return response.data
}

export const galleryRemoveImageBackground = async (imageIdOrSlug: string) => {
  const response = await galleryAPIAdminRequest('GET', `/rembg/${imageIdOrSlug}`)
  return response.data
}
