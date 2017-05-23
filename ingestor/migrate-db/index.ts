import * as PT from 'publication-types'
import { processMany } from '../../command-handler'
import db from './db'

const initialOffset = 0
const baseOffset = 250
const query = db('Publication')
  .select()
  .orderBy('lastUpdated', 'asc')
  .limit(baseOffset)

async function start() {
  publish()
}

async function publish(page: number = 0) {
  const offset = page * baseOffset
  const rows: PT.Schema.Publication[] = await query
    .clone()
    .offset(offset + initialOffset)

  if (rows.length === 0) {
    console.log('Finished')
    process.exit(0)
    return
  }

  const commands: PublishContent[] = []
  for (const story of rows) {
    const data = {
      ...story,
      content: story.content ? JSON.parse(story.content) : null,
      secondaryTopics: JSON.parse(story.secondaryTopics),
      posterImage: story.posterImage ? JSON.parse(story.posterImage) : null,
      socialImage: story.socialImage ? JSON.parse(story.socialImage) : null
    }

    const command: PublishContent = {
      contentId: data.id,
      type: 'PublishContent',
      source: 'TheWest',
      tags: ['database', 'postgres'],
      original: {
        type: 'batcave+json',
        content: JSON.stringify(data)
      },
      content: data,
      assets: []
    }

    commands.push(command)
    // We don't care about order
    // Fire them off and print the result
  }

  await processMany(commands)
  console.log(`Published ${rows.length} events`)
  publish(page + 1)
}

start()