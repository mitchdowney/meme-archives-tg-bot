import { config } from '../config'
import { sendImage } from './telegram'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const xrpl = require('xrpl')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require('axios')

function logMessage(message) {
  const timestamp = new Date().toISOString().replace('T', '-').split('.')[0]
  console.log(`[${timestamp}] ${message}`)
}

function logError(message) {
  const timestamp = new Date().toISOString().replace('T', '-').split('.')[0]
  console.error(`[${timestamp}] ${message}`)
}

export async function listenForNFTPurchases(account, issuerAddresses) {
  const client = new xrpl.Client('wss://s1.ripple.com')
  let isConnecting = false // Track connection state

  async function connectWithBackoff(retryCount = 0) {
    const maxRetries = 1000
    const backoffDelay = Math.min(1000 * 2 ** retryCount, 30000) // Cap delay at 30 seconds

    if (isConnecting) {
      logMessage('Connection attempt already in progress. Skipping...')
      return
    }

    isConnecting = true
    try {
      logMessage(`Connecting to XRPL WebSocket (Attempt ${retryCount + 1})...`)
      await client.connect()
      logMessage('Connected to XRPL WebSocket')

      await client.request({ command: 'subscribe', accounts: [account] })
      logMessage(`Listening for NFT purchases and listings from account: ${account}...`)

      isConnecting = false // Mark connection as successful

      setupTransactionListener(client)
      setupDisconnectionHandler(client, retryCount)
    } catch (error) {
      logError(`Connection failed: ${error.message}`)
      isConnecting = false // Reset connection state
      if (retryCount < maxRetries) {
        logMessage(`Retrying connection in ${backoffDelay / 1000} seconds...`)
        await new Promise((resolve) => setTimeout(resolve, backoffDelay))
        return connectWithBackoff(retryCount + 1)
      } else {
        logError('Max retries reached. Unable to reconnect to XRPL.')
      }
    }
  }

  function setupTransactionListener(client) {
    client.removeAllListeners('transaction') // Clear existing listeners
    client.on('transaction', async (tx) => {
      try {
        const transaction = tx.tx_json
        const meta = tx.meta

        if (transaction.TransactionType === 'NFTokenAcceptOffer') {
          const { guessedNFTokenID, guessedPurchaseAmount } = extractNFTInfo(meta)
          logMessage(`Guessed NFT ID: ${guessedNFTokenID}, Guessed Purchase Amount: ${guessedPurchaseAmount}`)
          if (guessedNFTokenID) {
            const isFromIssuer = await isNFTFromIssuer(guessedNFTokenID, issuerAddresses)
            if (isFromIssuer) {
              const priceInXRP = Math.floor(guessedPurchaseAmount / 1_000_000)
              const metadata = await fetchNFTMetadata(guessedNFTokenID, client)
              if (metadata) {
                notifyTelegram(metadata, priceInXRP, guessedNFTokenID)
              }
            }
          }
        }
      } catch (error) {
        logError('Error processing transaction: ' + error)
      }
    })
  }

  function setupDisconnectionHandler(client, retryCount) {
    client.removeAllListeners('disconnected') // Clear existing listeners
    client.removeAllListeners('error')

    client.on('disconnected', () => {
      logMessage('Disconnected from XRPL WebSocket')
      connectWithBackoff(retryCount + 1) // Retry connection with backoff
    })

    client.on('error', (error) => {
      logError('WebSocket encountered an error: ' + error)
      client.disconnect()
    })
  }

  // Start connection
  await connectWithBackoff()
}

async function fetchNFTMetadata(nftokenID, client) {
  logMessage(`Fetching NFT metadata for NFT ID: ${nftokenID}`)
  const maxRetries = 15
  const retryDelay = 15000 // 15 seconds
  
  let response
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      response = await client.request({
        command: 'nft_info',
        nft_id: nftokenID,
      })
      break // Exit loop if request is successful
    } catch (error) {
      if (error && error.error === 'tooBusy') {
        if (attempt < maxRetries) {
          console.log(`Attempt ${attempt} failed. Retrying in ${retryDelay / 1000} seconds...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        } else {
          console.log(`Attempt ${attempt} failed. No more retries left.`)
          throw error // Rethrow error if max retries reached
        }
      } else {
        throw error // Rethrow error if it's not the 'tooBusy' error
      }
    }
  }

  if (response.result && response.result.uri) {
    const uriHex = response.result.uri
    const uri = hexToAscii(uriHex)
    const ipfsUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
    const pattern = /https:\/\/ipfs\.io\/ipfs\/(bafybeicrf3fsgca7fr3qgijsuyienw6tiz6ecpcllwdlel4xkrk7qjf5yi)\/(\d+\.json)/

    if (!pattern.test(ipfsUrl)) {
      logMessage('URI does not match the expected pattern.')
      return null
    }

    const cloudfrontUrl = ipfsUrl.replace('https://ipfs.io/ipfs/', 'https://dt36cccabucs2.cloudfront.net/')

    logMessage(`Fetching NFT metadata from: ${cloudfrontUrl}`)

    try {
      const metadataResponse = await axios.get(cloudfrontUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        },
      })

      const formattedMetadata = {
        name: metadataResponse.data.name,
        description: metadataResponse.data.description,
        ipfsImage: metadataResponse.data.image,
        ipfsImageUrl: metadataResponse.data.image.replace('ipfs://', 'https://dt36cccabucs2.cloudfront.net/'),
        traits: metadataResponse.data.attributes
      }

      logMessage('formattedMetadata: \n' + JSON.stringify(formattedMetadata))

      return formattedMetadata
    } catch (error) {
      logError('Error fetching NFT metadata from cloudfront.net: ' + error)
    }
  } else {
    logMessage('No URI found in NFT metadata.')
    return null
  }
}

async function isNFTFromIssuer(nftTokenID, issuerAddresses) {
  logMessage(`Checking if NFT is from any of the issuers: ${issuerAddresses.join(', ')}`)
  const issuerAddressToCheck = nftTokenID.substring(0, 40)

  logMessage(`Checking NFT: Issuer Address=${issuerAddressToCheck}`)
  for (const issuerAddress of issuerAddresses) {
    logMessage(`Expected: Issuer Address=${issuerAddress}`)
    if (issuerAddressToCheck === issuerAddress) {
      return true
    }
  }

  return false
}

function extractNFTInfo(meta) {
  let guessedNFTokenID, guessedPurchaseAmount
  for (const node of meta.AffectedNodes) {
    if (node.DeletedNode?.LedgerEntryType === 'NFTokenOffer') {
      guessedNFTokenID = node.DeletedNode.FinalFields.NFTokenID
      guessedPurchaseAmount = parseInt(node.DeletedNode.FinalFields.Amount, 10)
      break
    }
  }
  return { guessedNFTokenID, guessedPurchaseAmount }
}

function notifyTelegram(metadata, priceInXRP, guessedNFTokenID) {
  const chat_ids = config.BOT_APP_ALLOWED_GROUP_CHAT_IDS || []
  const xrpCafeUrl = `https://xrp.cafe/nft/${guessedNFTokenID}`
  const text = `**RIPTARD SOLD 🔥\n${metadata.name} 🤡\n${priceInXRP} XRP 💰**\n[NFT on XRP Cafe 🔗](${xrpCafeUrl})`

  chat_ids.forEach(chat_id => {
    sendImage(`${chat_id}`, `${metadata.ipfsImageUrl}?0`, true, text, false, { parse_mode: 'Markdown' })
  })
}

function hexToAscii(hex) {
  let str = ''
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16))
  }
  return str
}
