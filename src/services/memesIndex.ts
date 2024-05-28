import { config } from '../config'
import { galleryGetAllTagsWithImages } from './galleryAPI'

const tagsCommandsIndexes = {}

export const initializeTagsCommandsIndexes = async () => {
  if (config.BOT_APP_ALLOWED_GROUP_CHAT_IDS) {
    for (const groupChatId of config.BOT_APP_ALLOWED_GROUP_CHAT_IDS) {
      await updateTagCommandsIndex(groupChatId)
    }
  }
}

export const updateTagCommandsIndex = async (groupChatId: number) => {
  const tagsWithImages = await galleryGetAllTagsWithImages()
  const tagsIndex = tagsWithImages.reduce((acc, tag) => {
    const originalTitle = tag.title
    const title = tag.title.toLowerCase().replace(/-/g, '_').replace(/\s/g, '_')
    acc[title] = originalTitle
    return acc
  }, {})
  tagsCommandsIndexes[groupChatId] = tagsIndex
}

export const getMatchingTagTitleFromTagCommandsIndex = (groupChatId: number, commandText: string) => {
  const commandPrefix = commandText.split(' ')[0]
  if (commandPrefix.startsWith('/')) {
    const tagsCommandsIndex = tagsCommandsIndexes[groupChatId]
    const parsedCommand = commandPrefix.substring(1)?.toLowerCase()
    const tagTitle = tagsCommandsIndex[parsedCommand]
    return tagTitle
  }
}
