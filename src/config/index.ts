export const config = {
  BOT_USER_NAME: process.env.BOT_USER_NAME,
  BOT_TOKEN: process.env.BOT_TOKEN,
  BOT_APP_ORIGIN: process.env.BOT_APP_ORIGIN,
  BOT_APP_SECRET_TOKEN: process.env.BOT_APP_SECRET_TOKEN,
  BOT_APP_ALLOW_ALL_GROUP_CHATS: process.env.BOT_APP_ALLOW_ALL_GROUP_CHATS?.toLowerCase() === 'true',
  BOT_APP_ALLOWED_GROUP_CHAT_IDS: process.env.BOT_APP_ALLOWED_GROUP_CHAT_IDS
    ?.split(',')
    .map(Number)
    .filter(Number.isInteger),
  BOT_APP_ALLOWED_USERNAMES: process.env.BOT_APP_ALLOWED_USERNAMES
    ?.split(','),
  GALLERY_WEB_ORIGIN: process.env.GALLERY_WEB_ORIGIN,
  GALLERY_API_ORIGIN: process.env.GALLERY_API_ORIGIN,
  GALLERY_API_SECRET_KEY: process.env.GALLERY_API_SECRET_KEY,
  GALLERY_IMAGE_BUCKET_ORIGIN: process.env.GALLERY_IMAGE_BUCKET_ORIGIN,
  GALLERY_IMAGE_PREVENT_BORDER_IMAGE: process.env.GALLERY_IMAGE_PREVENT_BORDER_IMAGE,
  GALLERY_IMAGE_PREVIEW_CROP_POSITION: process.env.GALLERY_IMAGE_PREVIEW_CROP_POSITION,
  GALLERY_USE_DEPRECATED_NO_BORDER_IMAGE_NAME: process.env.GALLERY_USE_DEPRECATED_NO_BORDER_IMAGE_NAME?.toLowerCase() === 'true',
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  OWNER_FIRST_NAME: process.env.OWNER_FIRST_NAME,
  OWNER_LAST_NAME: process.env.OWNER_LAST_NAME,
  OWNER_ID: process.env.OWNER_ID ? Number(process.env.OWNER_ID) : undefined,
}

export const telegramAPIBotUrl = `https://api.telegram.org/bot${config.BOT_TOKEN}`
export const telegramAPIBotFileUrl = `https://api.telegram.org/file/bot${config.BOT_TOKEN}`