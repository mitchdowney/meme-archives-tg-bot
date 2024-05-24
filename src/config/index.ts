export const config = {
  BOT_USER_NAME: process.env.BOT_USER_NAME,
  BOT_TOKEN: process.env.BOT_TOKEN,
  BOT_APP_ORIGIN: process.env.BOT_APP_ORIGIN,
  BOT_APP_SECRET_TOKEN: process.env.BOT_APP_SECRET_TOKEN,
  GALLERY_WEB_ORIGIN: process.env.GALLERY_WEB_ORIGIN,
  GALLERY_API_ORIGIN: process.env.GALLERY_API_ORIGIN,
  GALLERY_API_SECRET_KEY: process.env.GALLERY_API_SECRET_KEY,
  GALLERY_IMAGE_BUCKET_ORIGIN: process.env.GALLERY_IMAGE_BUCKET_ORIGIN,
  GALLERY_USE_DEPRECATED_NO_BORDER_IMAGE_NAME: process.env.GALLERY_USE_DEPRECATED_NO_BORDER_IMAGE_NAME?.toLowerCase() === 'true'
}

export const telegramAPIBotUrl = `https://api.telegram.org/bot${config.BOT_TOKEN}`
export const telegramAPIBotFileUrl = `https://api.telegram.org/file/bot${config.BOT_TOKEN}`