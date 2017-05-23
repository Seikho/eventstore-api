import * as dotenv from 'dotenv'
import * as path from 'path'
import { EventStore } from '../src'
import { Event, StreamEntry } from '../src/types'

dotenv.config({
  path: path.resolve(__dirname, '..', '.env')
})

/**
 * In reality, this would be a Web API instead of an adjacent module
 *
 * The implementation of this command could be shared as a library between ingestors
 * to reduce code duplication
 */

export async function processOne(command: Command): Promise<void> {
  const event = toEvent(command)
  const store = getContentStream(command.contentId)
  const projection = await getProjection(command.contentId, store)

  /**
   * Domain logic
   * This should exist in another function, but is here for demonstration
   */

  // Rule 1.
  // You cannot kill non-existant content
  if (command.type === 'KillContent' && !projection.status) {
    console.log(`[${command.type}:${command.contentId}] Rejected: Content does not exist`)
    return
  }

  // Rule 2.
  // You cannot revive non-existant content
  if (command.type === 'ReviveContent' && !projection.status) {
    console.log(`[${command.type}:${command.contentId}] Rejected: Content does not exist`)
    return
  }

  if (command.type === 'PublishContent') {
    // Rule 3.
    // If the content doesn't exist, it is a ContentCreated event
    if (!projection.status) {
      event.eventType = 'ContentCreated'
    }

    // Rule 4.
    // If the content exists, it is a ContentUpdated event
    if (projection.status) {
      event.eventType = 'ContentUpdated'
    }
  }

  console.log(`[${command.type}:${command.contentId}] Accepted '${event.eventType}'`)
  await store.publish([event])
}

export async function processMany(commands: Command[]): Promise<void> {
  for (const command of commands) {
    await processOne(command)
  }
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
    case 'KillContent':
      return {
        eventType: 'ContentKilled',
        data: {
          contentId: command.contentId,
          reason: command.reason
        }
      }
    case 'ReviveContent':
      return {
        eventType: 'ContentRevived',
        data: {
          contentId: command.contentId,
          reason: command.reason
        }
      }
  }

  throw new Error(`Unexpected command type: ${(command as any).type}`)
}

async function getProjection(contentId: string, store: EventStore<any>) {
  const projection = {
    id: contentId,
    status: ''
  }

  try {
    const contentEvents: Array<StreamEntry<SWMEvent<any>>> = []
    await store.backwardFrom(0, 20)

    while (true) {
      if (store.entries.length === 0) {
        break
      }
      contentEvents.push(...store.entries)
      await store.previous()
    }

    projection.status = getStatus(contentEvents)
  }
  finally {
    return projection
  }
}

function getContentStream(contentId: string) {
  const stream = `content-${contentId.toLowerCase()}`
  const store = new EventStore({
    host: process.env.JOURNAL_URL,
    stream,
    credentials: {
      user: 'admin',
      pass: 'changeit'
    }
  })

  return store
}

function getStatus(entries: Array<StreamEntry<SWMEvent<any>>>) {
  let status = ''
  for (const entry of entries) {
    switch (entry.eventType) {
      case 'ContentCreated':
      case 'ContentUpdated':
        status = (entry.event as ContentPublished<any>).content.status
        break
      case 'ContentKilled':
        status = 'dead'
        break
      case 'ContentRevived':
        status = 'live'
        break
    }
  }

  return status
}
