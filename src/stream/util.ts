import { getHostUrl } from '../config'
import request from '../request'
import {
  StreamLink,
  StreamResponse,
  StreamEventResponse,
  Relation,
  StreamEntry,
  Event,
  EventStream
} from 'types'
import * as uuid from 'uuid'

export default async function getStream<TData>(streamName: string): Promise<EventStream<TData>> {
  const uri = getStreamURL(streamName)
  const response = await getStreamResponse(uri)

  const stream = updateStream<TData>(response, getEmptyStream(streamName))
  stream.entries = () => Promise.all(response.entries.map(getStreamEntry))
    .then((entries: StreamEntry[]) => sortEntries(entries))
  return stream
}

/**
 * Warning: DESTRUCTIVE
 *
 * This function mutates the stream object
 */
function updateStream<TData>(response: StreamResponse, stream: EventStream<TData>): EventStream<TData> {
  const wantedLinks: Relation[] = [
    'self',
    'first',
    'last',
    'previous',
    'next',
    'metadata'
  ]

  for (const link of wantedLinks) {
    const rel = toRelation(link, response.links, stream)
    switch (link) {
      case 'self':
        stream.self = rel
        break
      case 'next':
        stream.next = rel
        break
      case 'previous':
        stream.previous = rel
        break
      case 'first':
        stream.first = rel
        break
      case 'last':
        stream.last = rel
        break
      case 'metadata':
        stream.metadata = rel
        break
      default:
        break
    }
  }

  return stream
}

function getEmptyStream<TData>(streamName: string): EventStream<TData> {
  const noop = () => Promise.resolve()

  const publish = (events: Array<Event<TData>>) => {
    return writeToStream(streamName, events)
  }

  return {
    self: noop,
    next: noop,
    previous: noop,
    first: noop,
    last: noop,
    metadata: noop,
    entries: noop as any,
    publish
  }
}

function toRelation<TData>(relation: Relation, links: StreamLink[] = [], stream: EventStream<TData>): () => Promise<StreamResponse | void> {
  const relLink = links.find(link => link.relation === relation)
  if (!relLink) {
    return () => Promise.resolve()
  }

  /**
   * We need to update the relation functions as we page through the entries
   */
  return async () => {
    const response = await getStreamResponse(relLink.uri)
    response.entries = sortEntries(response.entries)
    updateStream(response, stream)
    return response
  }
}

async function getStreamEntry<TData>(entry: StreamEntry) {
  const response = await request<StreamEventResponse<TData>>(entry.id, {
    headers: {
      'Accept': 'application/json'
    }
  })

  return response.body
}

async function getStreamResponse(uri: string): Promise<StreamResponse> {
  const response = await request<StreamResponse>(uri, {
    headers: {
      'Accept': 'application/vnd.eventstore.atom+json'
    }
  })

  return response.body
}

function getStreamURL(streamName: string): string {
  const baseUrl = getHostUrl()
  return `${baseUrl}streams/${streamName}`
}

async function writeToStream<TData>(streamName: string, events: Array<Event<TData>>) {
  const eventUrl = getStreamURL(streamName)
  const method = 'POST'

  const bodies = events.map(event => {
    return {
      data: event.data,
      eventType: event.eventType,
      eventId: uuid.v4()
    }
  })

  const body = bodies
  const result = await request<void>(eventUrl, {
    method,
    body: JSON.stringify(body),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/vnd.eventstore.events+json',
    }
  })

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(`[Code:${result.statusCode}] Failed to publish event`)
  }
}

function sortEntries(entries: StreamEntry[]) {
  return entries.sort((left, right) => {

    const leftId = Number(left.title.split('@')[0])
    const rightId = Number(right.title.split('@')[0])

    return leftId - rightId
  })
}