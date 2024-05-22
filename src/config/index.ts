export const config = {
  BOT_USER_NAME: process.env.BOT_USER_NAME,
  BOT_APP_ORIGIN: process.env.BOT_APP_ORIGIN,
  BOT_TOKEN: process.env.BOT_TOKEN,
}

export const telegramAPIBotUrl = `https://api.telegram.org/bot${config.BOT_TOKEN}`
