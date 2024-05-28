import { config } from '../config'
import { galleryGetAllTagsWithImages } from './galleryAPI'

const tagsCommandsIndexes = {}

export const initializeTagsCommandsIndexes = async () => {
  for (const groupChatId of config.BOT_APP_ALLOWED_GROUP_CHAT_IDS) {
    await updateTagCommandsIndex(groupChatId)
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
  console.log('tagsCommandsIndexes', tagsCommandsIndexes)
  console.log('groupChatId', groupChatId)
  console.log('commandText', commandText)
  const commandPrefix = commandText.split(' ')[0]
  console.log('commandPrefix', commandPrefix)
  if (commandPrefix.startsWith('/')) {
    const parsedCommand = commandPrefix.substring(1)
    console.log('parsedCommand', parsedCommand)
    const tagsCommandsIndex = tagsCommandsIndexes[groupChatId]
    console.log('tagsCommandsIndex', tagsCommandsIndex)
    const tagTitle = tagsCommandsIndex[parsedCommand]
    console.log('tagTitle', tagTitle)
    return tagTitle
  }
}
