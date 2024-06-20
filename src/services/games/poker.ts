/* eslint-disable @typescript-eslint/no-var-requires */
import { config } from '../../config'
import { sendImage } from '../telegram'

const sharp = require('sharp')
const path = require('path')

const pokerRoundsIndex = {}

type PokerRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'jack' | 'queen' | 'king' | 'ace' | 'joker'

type PokerSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'black' | 'red'

type PokerCard = {
  rank: PokerRank
  suit: PokerSuit
}

type PokerHand = {
  username: string
  hand: PokerCard[]
}

type PokerRound = {
  chatId: string
  dealerUsername: string
  playerUsernames: string[]
  pokerHands: PokerHand[]
  pokerDiscards: PokerHand[]
}

export const startPokerRound = (chatId: string, dealerUsername: string, playerUsernames: string[]): PokerRound => {
  const suits: PokerSuit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks: PokerRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace']
  const deck: PokerCard[] = []

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit })
    }
  }

  deck.push({ rank: 'joker', suit: 'black' })
  deck.push({ rank: 'joker', suit: 'red' })

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }

  const uniqueUsernames = [...new Set(playerUsernames)]

  const pokerHands = uniqueUsernames.map(username => {
    const hand = deck.slice(0, 5)
    deck.splice(0, 5)
    return { username, hand }
  })

  const pokerRound = {
    chatId,
    dealerUsername,
    playerUsernames,
    pokerHands,
    pokerDiscards: []
  }

  pokerRoundsIndex[chatId] = {
    ...pokerRoundsIndex[chatId],
    [dealerUsername]: pokerRound
  }

  return pokerRound
}

export const findPokerHand = (chatId: string, playerUsername: string): PokerHand | null => {
  const pokerRounds = pokerRoundsIndex[chatId]
  if (!pokerRounds) {
    console.log(`No poker rounds found for chatId: ${chatId}`)
    return null
  }

  for (const dealerUsername in pokerRounds) {
    const pokerRound = pokerRounds[dealerUsername]
    const playerHand = pokerRound.pokerHands.find(hand => hand.username === playerUsername)
    if (playerHand) {
      return playerHand
    }
  }

  console.log(`No hand found for user: ${playerUsername} in chatId: ${chatId}`)
  return null
}

export const sendPokerHand = async (chat_id: string, pokerHand: PokerHand) => {
  const imageUrl = await generatePokerHandImage(chat_id, pokerHand) 
  await sendImage(chat_id, imageUrl, true, `@${pokerHand.username}'`)
}

const generatePokerHandImage = async (chat_id: string, pokerHand: PokerHand) => {
  const canvasPath = path.join(__dirname, '../../assets/games/poker/poker_hand_canvas.png')
  const compositeOperations = pokerHand.hand.map((card, index) => {
    const cardImagePath = path.join(__dirname, `../../assets/games/poker/${card.suit.toLowerCase()}_${card.rank.toLowerCase()}.png`)
    return {
      input: cardImagePath,
      left: index * 234, // Each card is 234px wide, and 333px tall
      top: 0, // Align cards at the top of the canvas
    }
  })

  const currentDate = new Date()
  const imagePath = `../../assets/games/poker/hands/${chat_id}_${pokerHand.username}_${currentDate.getTime()}.png`
  const outputFile = path.join(__dirname, imagePath)
  await sharp(canvasPath)
    .composite(compositeOperations)
    .toFile(outputFile)

  const imageUrl = config.BOT_APP_ORIGIN + '/' + imagePath
  return imageUrl
}
