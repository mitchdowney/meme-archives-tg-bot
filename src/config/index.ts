export const config = {
  BOT_USER_NAME: process.env.BOT_USER_NAME,
  BOT_TOKEN: process.env.BOT_TOKEN,
  BOT_APP_ORIGIN: process.env.BOT_APP_ORIGIN,
  BOT_APP_SECRET_KEY: process.env.BOT_APP_SECRET_KEY,
  GALLERY_API_ORIGIN: process.env.GALLERY_API_ORIGIN,
  GALLERY_API_SECRET_KEY: process.env.GALLERY_API_SECRET_KEY
}

export const telegramAPIBotUrl = `https://api.telegram.org/bot${config.BOT_TOKEN}`
