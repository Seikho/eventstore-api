import * as dotenv from 'dotenv'
import * as path from 'path'
import { EventStore } from '../src'
import { Event } from '../src/types'

dotenv.config({
  path: path.resolve(__dirname, '..', '.env')
})

const store = new EventStore(
  {
    host: process.env.JOURNAL_URL,
    stream: 'publications',
    createStream: {
      metaReadRole: '$all',
      readRole: '$all'
    }
  })

/**
 * In reality, this would be a Web API instead of an adjacent module
 *
 * The implementation of this command could be shared as a library between ingestors
 * to reduce code duplication
 */

export async function processOne(command: Command): Promise<void> {
  const event = toEvent(command)
  console.log(`[COMMAND] Accepted '${command.type}' command`)
  await publish([event])
}

export async function processMany(commands: Command[]): Promise<void> {
  const events = commands.map(toEvent)
  for (const command of commands) {
    console.log(`[COMMAND] Accepted '${command.type}' command`)
  }
  await publish(events)
}

function toEvent(command: Command): Event<SWMEvent<any>> {
  switch (command.type) {
    case 'PublishContent':
      return {
        eventType: 'ContentPublished',
        data: {
          source: command.source,
          tags: command.tags,
          content: command.content,
          assets: command.assets,
          original: command.original
        }
      }
    default:
      throw new Error(`Unexpected command type: ${command.type}`)
  }
}

async function publish(events: Event<SWMEvent<any>>[]) {
  try {
    await store.publish(events)
  } catch (ex) {
    console.log('[PUBLISH] Failed: %s', ex.message)
  }
}