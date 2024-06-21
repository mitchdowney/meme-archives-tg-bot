/* eslint-disable @typescript-eslint/no-var-requires */
import { Request } from 'express'
import { config } from '../../config'
import { sendImage, sendMessage } from '../telegram'

const sharp = require('sharp')
const path = require('path')
const HandSolver = require('pokersolver').Hand

type PokerRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'jack' | 'queen' | 'king' | 'ace' | 'joker'

type PokerSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'black' | 'red'

type PokerCard = {
  rank: PokerRank
  suit: PokerSuit
}

type PokerHand = {
  username: string
  pokerHand: PokerCard[]
}

type PokerRound = {
  chatId: string
  dealerUsername: string
  playerUsernames: string[]
  pokerHands: PokerHand[]
  deckRemaining: PokerCard[]
  playerUsernamesFinishedDiscarding: string[]
}

type PokerDiscardPosition = 1 | 2 | 3 | 4 | 5

type PokerRoundsIndex = {
  [chatId: string]: {
    [dealerUsername: string]: PokerRound
  }
}

const pokerRoundsIndex: PokerRoundsIndex = {}

export const pokerRedrawCardsForPlayer = (chatId: string, playerUsername: string,
  discardPositions: PokerDiscardPosition[]): PokerRound | null => {
  const pokerRounds = pokerRoundsIndex[chatId]
  if (!pokerRounds) {
    console.log(`No poker rounds found for chatId: ${chatId}`)
    return null
  }

  const foundPokerHand = findPokerHand(chatId, playerUsername)
  if (!foundPokerHand) {
    console.log(`No poker hand found for user: ${playerUsername} in chatId: ${chatId}`)
    return null
  }

  const dealerUsername = foundPokerHand.dealerUsername
  const pokerRound = pokerRounds[dealerUsername]
  const pokerHand = foundPokerHand.pokerHand
  const pokerHandIndex = foundPokerHand.pokerHandIndex

  const hasAlreadyDiscarded = pokerRound.playerUsernamesFinishedDiscarding.includes(playerUsername)
  if (hasAlreadyDiscarded) {
    console.log(`Player has already discarded: ${playerUsername} in chatId: ${chatId}`)
    return null
  }

  discardPositions.forEach(position => {
    if (position < 1 || position > 5) {
      console.log(`Invalid discard position: ${position} ${playerUsername} in chatId: ${chatId}`)
      return null
    }
    const deckIndex = position - 1
    if (pokerRound?.deckRemaining?.length > 0) {
      const newCard = pokerRound.deckRemaining.shift()
      if (newCard) {
        pokerHand.pokerHand[deckIndex] = newCard
      }
    }
  })

  pokerRound.playerUsernamesFinishedDiscarding.push(playerUsername)
  pokerRound.pokerHands[pokerHandIndex] = pokerHand
  pokerRoundsIndex[chatId][dealerUsername] = pokerRound

  return pokerRound
}

export const checkIfAllPlayersHaveDiscarded = (pokerRound: PokerRound): boolean => {
  return pokerRound.playerUsernames.length === pokerRound.playerUsernamesFinishedDiscarding.length
}

export const dealFinalPokerHands = async (pokerRound: PokerRound) => {
  const pokerHands = pokerRound.pokerHands
  for (const pokerHand of pokerHands) {
    const has_spoiler = false
    await sendPokerHand(pokerRound.chatId, pokerHand, has_spoiler)
  }
}

export const sendPokerHandWinner = async (pokerRound: PokerRound) => {
  const pokerHands = pokerRound.pokerHands
  let highestRank = -1
  const handsWithRanks = pokerHands.map(pokerHand => {
    const hand = convertHandToPokerSolverHand(pokerHand)
    const handRank = HandSolver.solve(hand).rank
    highestRank = Math.max(highestRank, handRank)
    return { ...pokerHand, rank: handRank }
  })

  const winningHands = handsWithRanks.filter(hand => hand.rank === highestRank)

  if (winningHands.length === 1) {
    await sendMessage(pokerRound.chatId, `@${winningHands[0].username} wins! 🎉`)
  } else {
    const winnerUsernames = winningHands.map(hand => `@${hand.username}`).join(', ')
    await sendMessage(pokerRound.chatId, `It's a tie! The winners are ${winnerUsernames} 🎉`)
  }
}

const removeExistingRoundsWithUsernames = (chatId: string, playerUsernames: string[]) => {
  const pokerRounds = pokerRoundsIndex[chatId]
  if (pokerRounds) {
    const dealerUsernames = Object.keys(pokerRounds)
    for (const dealerUsername of dealerUsernames) {
      const pokerRound = pokerRounds[dealerUsername]
      const hasPlayerUsername = pokerRound.playerUsernames.some(username => playerUsernames.includes(username))
      if (hasPlayerUsername) {
        delete pokerRoundsIndex[chatId][dealerUsername]
      }
    }
  }
}

export const startPokerRound = (chatId: string, dealerUsername: string, playerUsernames: string[]): PokerRound => {
  removeExistingRoundsWithUsernames(chatId, playerUsernames)

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
    const pokerHand = deck.slice(0, 5)
    deck.splice(0, 5)
    return { username, pokerHand }
  })

  const pokerRound: PokerRound = {
    chatId,
    dealerUsername,
    playerUsernames,
    pokerHands,
    deckRemaining: deck,
    playerUsernamesFinishedDiscarding: []
  }

  pokerRoundsIndex[chatId] = {
    ...pokerRoundsIndex[chatId],
    [dealerUsername]: pokerRound
  }

  return pokerRound
}

type FoundPokerHand = {
  dealerUsername: string
  pokerHand: PokerHand
  pokerHandIndex: number
} | null

export const findPokerHand = (chatId: string, playerUsername: string): FoundPokerHand => {
  const pokerRounds = pokerRoundsIndex[chatId]
  if (!pokerRounds) {
    console.log(`No poker rounds found for chatId: ${chatId}`)
    return null
  }

  for (const dealerUsername in pokerRounds) {
    const pokerRound = pokerRounds[dealerUsername]
    const pokerHandIndex = pokerRound.pokerHands.findIndex(pokerHand => pokerHand.username === playerUsername)
    if (pokerHandIndex !== -1) {
      return {
        dealerUsername,
        pokerHand: pokerRound.pokerHands[pokerHandIndex],
        pokerHandIndex
      }
    }
  }

  console.log(`No hand found for user: ${playerUsername} in chatId: ${chatId}`)
  return null
}

export const sendPokerHand = async (chat_id: string, pokerHand: PokerHand, has_spoiler: boolean) => {
  const imageUrl = await generatePokerHandImage(chat_id, pokerHand)
  const handSolverCards = convertHandToPokerSolverHand(pokerHand)
  const handDescription = has_spoiler
    ? `@${pokerHand.username}`
    : `@${pokerHand.username} - ${HandSolver.solve(handSolverCards).descr}`

  const shouldCheckAndRetry = true
  await sendImage(chat_id, imageUrl, shouldCheckAndRetry, handDescription, has_spoiler)
}

const convertHandToPokerSolverHand = (pokerHand: PokerHand) => {
  const suitMap = {
    diamonds: 'd',
    clubs: 'c',
    hearts: 'h',
    spades: 's',
    black: 'b',
    red: 'r'
  }
  const rankMap = {
    '10': 'T',
    'jack': 'J',
    'queen': 'Q',
    'king': 'K',
    'ace': 'A',
    'joker': 'O'
  }

  return pokerHand?.pokerHand?.map(card => {
    const rank = rankMap[card.rank] || card.rank
    const suit = suitMap[card.suit]
    return `${rank}${suit}`
  }) || []
}

const generatePokerHandImage = async (chat_id: string, pokerHand: PokerHand) => {
  const canvasPath = path.join(__dirname, '../../assets/games/poker/poker_hand_canvas.png')
  const compositeOperations = pokerHand.pokerHand.map((card, index) => {
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

export const getDiscardPositions = (req: Request) => {
  const commandMessage = req.body.message.text
  const parts = commandMessage.split(' ').map(part => parseInt(part)).filter(part => !isNaN(part))
  const discardPositions = parts.filter(number => number >= 1 && number <= 5)
  return discardPositions as PokerDiscardPosition[]
}
