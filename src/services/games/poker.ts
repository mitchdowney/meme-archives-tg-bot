import { sendMessage } from '../telegram'

const pokerRoundsIndex = {}

type PokerRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'Jack' | 'Queen' | 'King' | 'Ace' | 'Joker'

type PokerSuit = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades' | 'Black' | 'Red'

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
  const suits: PokerSuit[] = ['Hearts', 'Diamonds', 'Clubs', 'Spades']
  const ranks: PokerRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace']
  const deck: PokerCard[] = []

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit })
    }
  }

  deck.push({ rank: 'Joker', suit: 'Black' })
  deck.push({ rank: 'Joker', suit: 'Red' })

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
  const pokerHandMessage = `@${pokerHand.username} ${pokerHand.hand.map(card => `${card.rank} of ${card.suit}`).join(', ')}`
  await sendMessage(chat_id, pokerHandMessage)
}
