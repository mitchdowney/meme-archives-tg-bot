export const config = {
  BOT_USER_NAME: process.env.BOT_USER_NAME,
  BOT_URL: process.env.BOT_URL,
  BOT_TOKEN: process.env.BOT_TOKEN,
}

export const telegramAPIBotUrl = `https://api.telegram.org/bot${config.BOT_TOKEN}`
