import { config } from '../config'

export type ImageVersion = 'animation' | 'border' | 'no-border' | 'preview' | 'video'

const hasImageUrl = (image: { has_border: boolean,
  has_no_border: boolean, has_animation: boolean, has_video: boolean }) => {
  return image.has_border || image.has_no_border || image.has_animation || image.has_video
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getAvailableImageUrl = (preferredVersion: ImageVersion | null, image: any | null) => {
  if (!image) return ''
  if (!hasImageUrl(image)) return ''
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
  } else if (imageVersion === 'video') {
    return `${bucketOrigin}/${id}-video.mp4`
  } else {
    return `${bucketOrigin}/${id}-border.png`
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAvailableImageVersion = (origVersion: ImageVersion | null, image: any) => {
  if (image.has_video) {
    return 'video'
  } else if (origVersion === 'animation' && image.has_animation) {
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
          : image.has_video
            ? 'video'
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
  const tagTitles = getTagTitles(image.tags)
  const artistNames = getArtistNames(image.artists)
  const imageWebLink = getImageWebLink(image.slug || image.id)

  return `Title: ${image.title}${tagTitles ? `\nTags: ${tagTitles}` : ''}${artistNames ? `\nArtist: ${artistNames}` : ''}\nID: ${image.id}${image.slug ? `\nSlug: ${image.slug}` : ''}\nWeb Link: ${imageWebLink}`
}

export const getArtistWebLink = (id: number | string) => {
  return `${config.GALLERY_WEB_ORIGIN}/artist/${id}`
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getArtistInfo = (artist: any) => {
  const artistWebLink = getArtistWebLink(artist.slug || artist.id)
  return `Name: ${artist.name}${artist.slug ? `\nSlug: ${artist.slug}` : ''}${artist.deca_username ? `\nDeca: ${artist.deca_username}` : ''}${artist.foundation_username ? `\nFoundation: ${artist.foundation_username}` : ''}${artist.instagram_username ? `\nInstagram: ${artist.instagram_username}` : ''}${artist.superrare_username ? `\nSuperrare: ${artist.superrare_username}` : ''}${artist.twitter_username ? `\nTwitter: ${artist.twitter_username}` : ''}\nWeb Link: ${artistWebLink}`
}

type ArtistProfilePictureVersion = 'original' | 'preview'

export const getArtistProfilePictureUrl = (id: number, artistVersion: ArtistProfilePictureVersion) => {
  const bucketOrigin = config.GALLERY_IMAGE_BUCKET_ORIGIN
  if (artistVersion === 'preview') {
    return `${bucketOrigin}/artists/${id}-preview.png`
  } else if (artistVersion === 'original') {
    return `${bucketOrigin}/artists/${id}-original.png`
  } else {
    return ''
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
