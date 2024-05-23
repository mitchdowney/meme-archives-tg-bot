import { config } from '../config'

type ImageVersion = 'animation' | 'border' | 'no-border' | 'preview'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getAvailableImageUrl = (preferredVersion: ImageVersion | null, image: any | null) => {
  if (!image) return ''
  const availableImageVersion = getAvailableImageVersion(preferredVersion, image)
  return getImageUrl(image.id, availableImageVersion)
}

export const getImageUrl = (id: number, imageVersion: ImageVersion) => {
  const bucketOrigin = config.GALLERY_IMAGE_BUCKET_ORIGIN
  if (imageVersion === 'animation') {
    return `${bucketOrigin}/${id}-animation.gif`
  } else if (imageVersion === 'no-border') {
    const imageNameEnding = config.GALLERY_USE_DEPRECATED_NO_BORDER_IMAGE_NAME ? '-no-border' : ''
    return `${bucketOrigin}/${id}${imageNameEnding}.png`
  } else if (imageVersion === 'preview') {
    return `${bucketOrigin}/${id}-preview.png`
  } else {
    return `${bucketOrigin}/${id}-border.png`
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAvailableImageVersion = (origVersion: ImageVersion | null, image: any) => {
  if (origVersion === 'animation' && image.has_animation) {
    return 'animation'
  } else if (origVersion === 'border' && image.has_border) {
    return 'border'
  } else if (origVersion === 'no-border' && image.has_no_border) {
    return 'no-border'
  } else if (origVersion === 'preview') {
    return 'preview'
  } else {
    return image.has_border
      ? 'border'
      : image.has_no_border
        ? 'no-border'
        : image.has_animation
          ? 'animation'
          : 'border'
  }
}

export const getImageWebLink = (id: number | string) => {
  return `${config.GALLERY_WEB_ORIGIN}/${id}`
}

export const getTagTitles = (tags: { title: string }[]) => {
  return tags.map(tag => tag.title).join(', ')
}

export const getArtistNames = (artists: { name: string }[]) => {
  return artists.map(artist => artist.name).join(', ')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getImageInfo = (image: any) => {
  const imageWebLink = getImageWebLink(image.slug || image.id)
  const tagTitles = getTagTitles(image.tags)
  const artistNames = getArtistNames(image.artists)

  return `Title: ${image.title}\nTags: ${tagTitles ? tagTitles : ''}${artistNames ? `\nArtist: ${artistNames}` : ''}\nID: ${image.id}${image.slug ? `\nPath: ${image.slug}` : ''}\nWeb Link: ${imageWebLink}`
}