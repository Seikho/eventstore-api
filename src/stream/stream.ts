import { getHostUrl } from '../config'
import request from '../request'
import {
  StreamLink,
  StreamResponse,
  StreamEventResponse,
  Relation,
  StreamEntry,
  Event
} from 'types'
import * as uuid from 'uuid'

type StreamRequester = () => Promise<StreamResponse | void>
type StreamEntryRequester<TData> = () => Promise<Array<StreamEventResponse<TData>>>

export class EventStoreStream<TData> {
  stream: string
  host: string

  self: StreamRequester = () => Promise.resolve()
  next: StreamRequester = () => Promise.resolve()
  previous: StreamRequester = () => Promise.resolve()
  first: StreamRequester = () => Promise.resolve()
  last: StreamRequester = () => Promise.resolve()
  entries: StreamEntryRequester<TData> = () => Promise.resolve([])

  constructor(options: { host: string, stream: string }) {
    this.host = normaliseUrl(options.host)
    this.stream = options.stream
  }

  init = async () => {
    const url = this.host + this.stream
    const response = await getStreamResponse(url)
    this.updateRelations(response.links)
  }

  /**
   * Convert a relation ('self', 'first', 'next', ...) to a function
   * that fetches the link then updates the 'position' of the stream.
   *
   * Changing the position will update the other relation functions to return
   * results that are relative to the position relation just fetched
   */
  toRelation = (relation: Relation, links: StreamLink[]) => {
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
      this.entries = () => Promise.all(response.entries.map(getStreamEntry))
      this.updateRelations(response.links)
      return response
    }
  }

  /**
   * Change the relation functions to be relative to the links of the relation
   *
   * @param links The links of the relation just fetched that all functions will become relative to
   */
  updateRelations = (links: StreamLink[]) => {
    const toRel = (relation: Relation) => this.toRelation(relation, links)
    this.self = toRel('self')
    this.first = toRel('first')
    this.last = toRel('last')
    this.previous = toRel('previous')
    this.next = toRel('next')
  }

  publish = async (events: Array<Event<TData>>) => {
    return writeToStream(this.stream, events)
  }
}

export function normaliseUrl(url: string) {
  const isSlash = url.slice(-1) === '/'
  return isSlash
    ? url
    : url + '/'
}

export async function getStreamEntry<TData>(entry: StreamEntry) {
  const response = await request<StreamEventResponse<TData>>(entry.id, {
    headers: {
      'Accept': 'application/json'
    }
  })

  return response.body
}

export async function getStreamResponse(uri: string): Promise<StreamResponse> {
  const response = await request<StreamResponse>(uri, {
    headers: {
      'Accept': 'application/vnd.eventstore.atom+json'
    }
  })

  return response.body
}

export function getStreamURL(streamName: string): string {
  const baseUrl = getHostUrl()
  return `${baseUrl}streams/${streamName}`
}

export async function writeToStream<TData>(streamName: string, events: Array<Event<TData>>) {
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

export function sortEntries(entries: StreamEntry[]) {
  return entries.sort((left, right) => {

    const leftId = Number(left.title.split('@')[0])
    const rightId = Number(right.title.split('@')[0])

    return leftId - rightId
  })
}