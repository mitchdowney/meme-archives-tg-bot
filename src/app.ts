/* eslint-disable no-useless-escape */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('cors')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path')

import * as express from 'express'
import { NextFunction, Request, Response } from 'express'
import { HttpError } from 'http-errors'
import { getArtistInfo, getArtistProfilePictureUrl, getAvailableImageUrl,
  getImageInfo } from './lib/galleryHelpers'
import { checkBotAppSecretKey } from './middleware/checkTelegramSecretKey'
import { checkIsGroupAdmin } from './services/checkIsGroupAdmin'
import { galleryEditArtist, galleryEditImage, galleryGetArtist, galleryGetImage, galleryGetImagesByArtist, galleryGetRandomImage,
  galleryRemoveImageBackground, galleryUploadImage } from './services/galleryAPI'
import { autoDeleteMatchingMessages, getChatId, getCommandText, getImageFile, getMentionedUserNames, getUserMention, getUserName,
  parseEditArtistCommand, parseEditImageCommand, parseUploadImageCommand, sendDocument, sendGalleryAdmin,
  sendImage, sendMessage, setWebhook, 
  uploadAndSendVideoFromCache} from './services/telegram'
import { checkIsAllowedChat } from './middleware/checkIsAllowedChat'
import { config } from './config'
import { getMatchingTagTitleFromTagCommandsIndex, initializeTagsCommandsIndexes,
  updateTagCommandsIndex } from './services/memesIndex'
import { checkIfAllPlayersHaveDiscarded, dealFinalPokerHands, getDiscardPositions, pokerRedrawCardsForPlayer,
  sendPokerHand, sendPokerHandWinner, startPokerRound } from './services/games/poker'
import { delay } from './lib/utility'
import { sendDiscordMessage } from './services/discord'
import { listenForNFTPurchases } from './services/xrplHelpers'

const port = 9000

/*
  On startup, initialize the tagCommandsIndex for each group chat.
*/
initializeTagsCommandsIndexes()

const startApp = async () => {

  const deployerWalletAddress = 'rpx9JThQ2y37FaGeeJP7PXDUVEXY3PHZSC' // Account from raw data, this corresponds with the xrp.cafe wallet
  // const nftMinterWalletAddress = 'rKqqb5QZXVAL3VqXJL6obfRGeHou1DtyBV' // Minter from raw data
  
  const issuerAddresses = [
    '2E65A654EE811F9948D3EF4F273135BCEF6AB558', // Riptards 1000
    '87A44BF2DB8E94E6FC3CCBB3ABA11748352487EB', // Riptards 1/1s
    '7312199D24CAB41A7335FFAEAD70640C928537D0', // Riptards Whoami
    'F8D52353DFBEA4DBA562A0BCE2CA1B8746A3F145', // Test Collection
  ]

  listenForNFTPurchases(deployerWalletAddress, issuerAddresses)

  const app = express()
  app.use(express.json({
    limit: '50mb'
  }))
  app.use(express.urlencoded({
    limit: '50mb',
    extended: true
  }))

  app.use(cors())

  app.get('/', async function (req: Request, res: Response) {
    res.send('The bot is running!')
  })

  app.use('/assets', express.static(path.join(__dirname, 'assets')))

  app.get('/activate', async function (req: Request, res: Response) {
    try {
      await setWebhook()
      res.send('Webhook set successfully.')
    } catch (error) {
      res.status(400)
      res.send({ message: error.message })
    }
  })

  /*
    app.get('/deactivate', async function (req: Request, res: Response) {
      try {
        await deleteWebhook()
        res.send('Webhook deleted successfully.')
      } catch (error) {
        res.status(400)
        res.send({ message: error.message })
      }
    })
  */

  app.post('/webhook',
    function (req: Request, res: Response, next: NextFunction) {
      // Send 200 response immediately so that commands are not retried
      res.sendStatus(200)
      next()
    },
    checkBotAppSecretKey,
    checkIsAllowedChat,
    async function (req: Request, res: Response, next: NextFunction) {
      try {
        const shouldAbort = await autoDeleteMatchingMessages(req)
        if (shouldAbort) {
          return
        }

        const commandText = getCommandText(req)
        const callbackDataObject = req.body.callback_query?.data ? JSON.parse(req.body.callback_query.data) : null
        if (commandText) {
          const commands = {
            '/ea': webhookHandlers.editArtist,
            '/edit_artist': webhookHandlers.editArtist,
            '/edit_image': webhookHandlers.editImage,
            '/ei': webhookHandlers.editImage,
            '/feature_artist': webhookHandlers.featureArtist,
            '/gallery_admin': webhookHandlers.galleryAdmin,
            '/gallery_hello': webhookHandlers.galleryHello,
            '/gallery_standards': webhookHandlers.galleryStandards,
            '/get_image_file': webhookHandlers.getImageFile,
            '/get_image_meta': webhookHandlers.getImageMeta,
            '/get_image': webhookHandlers.getImage,
            '/get_random_image_meta': webhookHandlers.getRandomImageMeta,
            '/meme': webhookHandlers.getRandomImage,
            '/riptard': webhookHandlers.getRandomImage,
            '/my_id': webhookHandlers.myId,
            '/remove_image_background': webhookHandlers.removeImageBackground,
            '/random_image': webhookHandlers.getRandomImage,
            '/random': webhookHandlers.getRandomImage,
            '/refresh_tags': webhookHandlers.refreshTags,
            '/ui': webhookHandlers.uploadImage,
            '/upload_image': webhookHandlers.uploadImage,
            '/poker_deal': webhookHandlers.pokerDeal,
            '/poker_draw': webhookHandlers.pokerDraw,
            // '/raid': webhookHandlers.discordForwardRaidMessage
          }
          
          for (const [command, handler] of Object.entries(commands)) {
            if (new RegExp(`(^|\\s)(?!.*\\bhttps?:\\/\\/\\b)${command}(\\s|@${config.BOT_USER_NAME}\\s|$)`).test(commandText?.toLowerCase())) {
              await handler(req)
              // return so that the command is not checked against the tagCommandsIndex
              return
            }
          }

          /*
            If none of those test true, then check if the command has a matching tag title in the gallery.
            If it does, return a random meme for that tag.
          */
          const groupChatId = getChatId(req)
          const tagCommandsIndexMatchingTitle = getMatchingTagTitleFromTagCommandsIndex(groupChatId, commandText)
          if (tagCommandsIndexMatchingTitle) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let image: any = null
            try {
              image = await galleryGetRandomImage(tagCommandsIndexMatchingTitle)
            } catch (error) {
              console.error(error)
            }

            if (image) {
              const isVideo = image.has_video
              const isAnimation = image.has_animation
              
              if (isVideo) {
                await uploadAndSendVideoFromCache(groupChatId, image.id)
              } else if (isAnimation) {
                await uploadAndSendVideoFromCache(groupChatId, image.id)
              } else if (!isVideo && !isAnimation) {
                const imageUrl = getAvailableImageUrl('no-border', image)
                if (imageUrl) {
                  await sendImage(groupChatId, imageUrl)
                } else {
                  // await sendMessage(groupChatId, 'Image not found')
                }
              }
            }
          }

        } else if (callbackDataObject?.callback_data) {
          const callbackDataHandlers = {
            'edit_artist_prompt': webhookHandlers.editArtistPrompt,          
            'edit_image_prompt': webhookHandlers.editImagePrompt,
            'get_image_prompt': webhookHandlers.getImagePrompt,
            'upload_image_prompt': webhookHandlers.uploadImagePrompt
          }
        
          const handler = callbackDataHandlers[callbackDataObject.callback_data]
          if (handler) {
            await handler(req)
          }
        }
      } catch (error) {
        next(error)
      }
    })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: HttpError, req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(error)
    }

    const chat_id = getChatId(req)
    const errorMessage = error?.response?.data?.message || error?.message

    if (chat_id && errorMessage) {
      sendMessage(chat_id, errorMessage)
    }
  })

  app.listen(port)

  console.log(`App is listening on port ${port}`)
}

(async() => {
  await startApp()
})()

const webhookHandlers = {
  galleryHello: async (req: Request) => {
    const chat_id = req?.body?.message?.chat?.id
    const username = req?.body?.message?.from?.username
    const userId = req?.body?.message?.from?.id
    const text = `Hello ${getUserMention(username, userId)}`
    await sendMessage(chat_id, text)
  },
  galleryAdmin: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const chat_id = req?.body?.message?.chat?.id
    await sendGalleryAdmin(chat_id)
  },
  getImagePrompt: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const chat_id = req?.body?.callback_query?.message?.chat?.id
    await sendMessage(
      chat_id, 
      'GET: type \`/get_image\` followed by the image id or slug. use \`/get_image_meta\` for full info',
      { parse_mode: 'Markdown' }
    )
  },
  uploadImagePrompt: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const chat_id = req?.body?.callback_query?.message?.chat?.id
    await sendMessage(
      chat_id, 
      'UPLOAD: reply to a file or image (file is better to prevent TG image compression), then type \`/upload_image\` with the following optional parameters:\n-t title\n-ts tags,separated,by,comma\n-a artists,separated,by,comma\n-s url-slug',
      { parse_mode: 'Markdown' }
    )
  },
  editImagePrompt: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const chat_id = req?.body?.callback_query?.message?.chat?.id
    await sendMessage(
      chat_id, 
      'EDIT: type \`/edit_image\` with the following required parameter:\n-i id-or-slug\noptional parameters:\n-t title\n-ts tags,separated,by,comma\n-a artists,separated,by,comma\n-s url-slug',
      { parse_mode: 'Markdown' }
    )
  },
  editArtistPrompt: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const chat_id = req?.body?.callback_query?.message?.chat?.id
    await sendMessage(
      chat_id, 
      'EDIT: type \`/edit_artist\` with the following required parameter:\n-i id-or-slug\noptional parameters:\n-n name\n-s url-slug\n-deca deca username\n-foundation foundation username\n-instagram instagram username\n-superrare superrare username\n-twitter twitter username\nreply to a file or image to change the profile picture',
      { parse_mode: 'Markdown' }
    )
  },
  getImage: async (req: Request) => {
    const commandText = getCommandText(req)
    const chat_id = req?.body?.message?.chat?.id
    const imageId = commandText.split(' ')[1]
    const image = await galleryGetImage(imageId)
    const imageUrl = getAvailableImageUrl('no-border', image)
    if (imageUrl) {
      await sendImage(chat_id, imageUrl)
    } else {
      await sendMessage(chat_id, 'Image not found')
    }
  },
  getImageMeta: async (req: Request) => {
    const commandText = getCommandText(req)
    const chat_id = req?.body?.message?.chat?.id
    const imageId = commandText.split(' ')[1]
    const image = await galleryGetImage(imageId)
    const imageUrl = getAvailableImageUrl('no-border', image)
    const text = getImageInfo(image)
    if (imageUrl) {
      const shouldCheckAndRetry = false
      await sendImage(chat_id, imageUrl, shouldCheckAndRetry, text)
    } else {
      await sendMessage(chat_id, text)
    }
  },
  getRandomImage: async (req: Request) => {
    const commandText = getCommandText(req)
    const chat_id = req?.body?.message?.chat?.id
    const title = commandText.split(' ')[1]
    const image = await galleryGetRandomImage(title)
    const imageUrl = getAvailableImageUrl('no-border', image)
    if (imageUrl) {
      await sendImage(chat_id, imageUrl)
    } else {
      await sendMessage(chat_id, 'Image not found')
    }
  },
  getRandomImageMeta: async (req: Request) => {
    const commandText = getCommandText(req)
    const chat_id = req?.body?.message?.chat?.id
    const title = commandText.split(' ')[1]
    const image = await galleryGetRandomImage(title)
    const imageUrl = getAvailableImageUrl('no-border', image)
    const text = getImageInfo(image)
    if (imageUrl) {
      const shouldCheckAndRetry = false
      await sendImage(chat_id, imageUrl, shouldCheckAndRetry, text)
    } else {
      await sendMessage(chat_id, text)
    }
  },
  featureArtist: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const commandText = getCommandText(req)
    const chat_id = req?.body?.message?.chat?.id
    const artistName = commandText.split(' ')[1]
    const total = commandText.split(' ')[2]
    const timeOfIntervalInSeconds = commandText.split(' ')[3]
    const sort = 'random'
    const images = await galleryGetImagesByArtist(artistName, total, sort)

    for (const image of images) {
      const imageUrl = getAvailableImageUrl('no-border', image)
      if (imageUrl) {
        await sendImage(chat_id, imageUrl)
      }
      await delay(timeOfIntervalInSeconds * 1000)
    }    
  },
  myId: async (req: Request) => {    
    const chat_id = getChatId(req)
    sendMessage(chat_id, `Your Telegram ID is ${req?.body?.message?.from?.id}`)
  },
  getImageFile: async (req: Request) => {
    const commandText = getCommandText(req)
    const chat_id = req?.body?.message?.chat?.id
    const imageId = commandText.split(' ')[1]
    const image = await galleryGetImage(imageId)
    const imageUrl = getAvailableImageUrl('no-border', image)
    const caption = getImageInfo(image)
    if (imageUrl) {
      await sendDocument(chat_id, imageUrl, caption)
    } else {
      await sendMessage(chat_id, 'Image not found')
    }
  },
  uploadImage: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const commandText = getCommandText(req)
    const chat_id = req?.body?.message?.chat?.id
    const parsedCommand = parseUploadImageCommand(commandText)
    const imageUploadData = await getImageFile(req)
  
    const { title, tagTitles, artistNames, slug, prevent_border_image } = parsedCommand
    
    const image = await galleryUploadImage({
      title,
      tagTitles,
      artistNames,
      slug,
      prevent_border_image,
      imageUploadData
    })

    const imageUrl = getAvailableImageUrl('no-border', image)
    const text = getImageInfo(image)
    if (imageUrl) {
      const shouldCheckAndRetry = true
      await sendImage(chat_id, imageUrl, shouldCheckAndRetry, text)
    } else {
      await sendMessage(chat_id, text)
    }

    updateTagCommandsIndex(chat_id)
  },
  editImage: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const commandText = getCommandText(req)
    const chat_id = req?.body?.message?.chat?.id
    const parsedCommand = parseEditImageCommand(commandText)
    const imageUploadData = await getImageFile(req)
  
    const { id: idOrSlug, title, tagTitles, artistNames, slug, prevent_border_image } = parsedCommand
    
    const previousImageData = await galleryGetImage(idOrSlug)

    const previousTagTitles = previousImageData.tags?.map(tag => tag.title)
    const previousArtistNames = previousImageData.artists?.map(artist => artist.name)

    const image = await galleryEditImage(previousImageData.id, {
      ...previousImageData,
      ...(title ? { title } : {}),
      ...(tagTitles?.length ? { tagTitles } : { tagTitles: previousTagTitles }),
      ...(artistNames?.length ? { artistNames } : { artistNames: previousArtistNames}),
      ...(slug ? { slug } : {}),
      ...(prevent_border_image ? { prevent_border_image } : {}),
      imageUploadData
    })

    const imageUrl = getAvailableImageUrl('no-border', image)
    const text = getImageInfo(image)
    if (imageUrl) {
      const shouldCheckAndRetry = true
      await sendImage(chat_id, imageUrl, shouldCheckAndRetry, text)
    } else {
      await sendMessage(chat_id, text)
    }

    updateTagCommandsIndex(chat_id)
  },
  editArtist: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const commandText = getCommandText(req)
    const chat_id = req?.body?.message?.chat?.id
    const parsedCommand = parseEditArtistCommand(commandText)
    const imageUploadData = await getImageFile(req)
  
    const { id: idOrSlug, name, slug, deca_username, foundation_username,
      instagram_username, superrare_username, twitter_username
    } = parsedCommand
    
    const previousArtistData = await galleryGetArtist(idOrSlug)

    await galleryEditArtist(previousArtistData.id, {
      ...previousArtistData,
      ...(name ? { name } : {}),
      ...(slug ? { slug } : {}),
      ...(deca_username ? { deca_username } : {}),
      ...(foundation_username ? { foundation_username } : {}),
      ...(instagram_username ? { instagram_username } : {}),
      ...(superrare_username ? { superrare_username } : {}),
      ...(twitter_username ? { twitter_username } : {}),
      imageUploadData
    })

    const newArtistData = await galleryGetArtist(previousArtistData.id)

    const imageUrl = getArtistProfilePictureUrl(previousArtistData.id, 'original')
    const text = getArtistInfo(newArtistData)
    if (imageUrl) {
      const shouldCheckAndRetry = true
      await sendImage(chat_id, imageUrl, shouldCheckAndRetry, text)
    } else {
      await sendMessage(chat_id, text)
    }

    updateTagCommandsIndex(chat_id)
  },
  refreshTags: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const chat_id = getChatId(req)
    if (chat_id) {
      await updateTagCommandsIndex(chat_id)
    }
  },
  removeImageBackground: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const commandText = getCommandText(req)
    const chat_id = req?.body?.message?.chat?.id
    const imageId = commandText.split(' ')[1]
    await galleryRemoveImageBackground(imageId)
    const image = await galleryGetImage(imageId)
    const imageUrl = getAvailableImageUrl('no-border', image)
    const caption = getImageInfo(image)
    if (imageUrl) {
      await sendDocument(chat_id, imageUrl, caption)
    } else {
      await sendMessage(chat_id, 'Image not found')
    }
  },
  galleryStandards: async (req: Request) => {
    const chat_id = req?.body?.message?.chat?.id
    // eslint-disable-next-line quotes
    const text = `Try to make image titles and tags as intuitive for searching as possible.\nTry to reuse existing tag names.\nSearch the gallery to make sure the image your uploading isn't there already.\nIf an image is a profile picture, use the \"pfp\" tag.\nUse capitalization for titles like a book title (lowercase articles), unless you think it should be an exception.`
    await sendMessage(chat_id, text)
  },
  pokerDeal: async (req: Request) => {
    await checkIsGroupAdmin(req)
    const chat_id = getChatId(req)
    const dealerUserName = getUserName(req)
    const playerUserNames = getMentionedUserNames(req)
    const pokerRound = startPokerRound(chat_id, dealerUserName, [dealerUserName, ...playerUserNames.slice(0, 4)])
    if (pokerRound) {
      for (const pokerHand of pokerRound.pokerHands) {
        const has_spoiler = true
        await sendPokerHand(chat_id, pokerHand, has_spoiler)
      }
    }
  },
  pokerDraw: async (req: Request) => {
    const chat_id = getChatId(req)
    const playerUsername = getUserName(req)
    const discardPositions = getDiscardPositions(req)
    const pokerRound = pokerRedrawCardsForPlayer(chat_id, playerUsername, discardPositions)
    console.log('pokerDraw pokerRound', pokerRound)
    if (pokerRound) {
      const allPlayersHaveDiscarded = checkIfAllPlayersHaveDiscarded(pokerRound)
      if (allPlayersHaveDiscarded) {
        await dealFinalPokerHands(pokerRound)
        if (pokerRound.pokerHands.length > 1) {
          await sendPokerHandWinner(pokerRound)
        }
      }
    }
  },
  discordForwardRaidMessage: async (req: Request) => {
    const commandText = getCommandText(req)
    const raidCommandPattern = /^\/raid\s+(https:\/\/x\.com\/\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/
    const match = commandText.match(raidCommandPattern)

    if (match) {
      const url = match[1]
      const messageBody = `Telegram Raid 🚨 ${url}`
      await sendDiscordMessage(messageBody)
    }
  }
}
