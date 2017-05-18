import * as uuid from 'uuid'
import request from './request'
import {
  StreamLink,
  StreamResponse,
  StreamEventResponse,
  Relation,
  Event
} from './types'

import {
  getStreamResponse,
  normaliseUrl,
  getStreamEntry,
  sortEntries,
  writeToStream,
  getAtom
} from './util'

type StreamRequester = () => Promise<StreamResponse | void>
type StreamEntryRequester<TData> = () => Promise<Array<StreamEventResponse<TData>>>

type CreateOptions = {
  readRole: string
  metaReadRole: string
}

type Credentials = {
  username: string
  password: string
}

type ConstructorOptions = {
  host: string
  stream: string
  createStream?: CreateOptions
  credentials?: Credentials
}

export class EventStore<TData> {
  private stream: string
  private host: string
  private initialised = false
  private credentials = {
    username: '',
    password: ''
  }

  self: StreamRequester = () => Promise.resolve()
  next: StreamRequester = () => Promise.resolve()
  previous: StreamRequester = () => Promise.resolve()
  first: StreamRequester = () => Promise.resolve()
  last: StreamRequester = () => Promise.resolve()
  entries: StreamEntryRequester<TData> = () => Promise.resolve([])

  constructor(options: ConstructorOptions) {
    this.host = normaliseUrl(options.host)
    this.stream = options.stream

    if (options.credentials) {
      this.credentials = options.credentials
    }

    this.init(options.createStream)
  }

  // Every public request must be prefaced with thi
  private async init(options?: CreateOptions) {
    if (this.initialised) {
      return
    }

    if (options) {
      await this.createStream(options)
    }

    const url = `${this.host}streams/${this.stream}`
    const response = await getStreamResponse(url)
    this.updateRelations(response.links)
    this.initialised = true
  }

  private async createStream(options: CreateOptions) {
    const existingStream = await getStreamResponse(`${this.host}streams/${this.stream}`)
    if (existingStream) {
      return
    }

    // TODO: Pass credentials through in request
    const url = `${this.host}streams/${this.stream}/metadata`
    const event = {
      eventId: uuid.v4(),
      eventType: '$user-updated',
      data: options
    }

    const response = await request(url,
      {
        body: JSON.stringify([event]),
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.eventstore.events+json' }
      })
    return response
  }

  subscribe = async (group: string) => {
    await this.init()
    const url = `${this.host}subscriptions/${this.stream}/${group}`
    const response = await getAtom<TData>(url)
    return response
  }

  publish = async (events: Array<Event<TData>>) => {
    await this.init()
    return writeToStream(this.host, this.stream, events)
  }

  /**
   * This will read the stream from the position and adjust the relation functions
   * to be relative to the new position
   */
  async forwardFrom(fromPosition: StreamPosition, amount: number = 20) {
    await this.init()
    const url = `${this.host}streams/${this.stream}/${fromPosition}/forward/${amount}`
    const response = await getStreamResponse(url)
    this.updateRelations(response.links)
    return response
  }

  /**
   * This will read the stream from the position and adjust the relation functions
   * to be relative to the new position
   */
  async backwardFrom(fromPosition: StreamPosition, amount: number = 20) {
    await this.init()
    const url = `${this.host}${this.stream}/${fromPosition}/backward/${amount}`
    const response = await getStreamResponse(url)
    this.updateRelations(response.links)
    return response
  }

  /**
   * Convert a relation ('self', 'first', 'next', ...) to a function
   * that fetches the link then updates the 'position' of the stream.
   *
   * Changing the position will update the other relation functions to return
   * results that are relative to the position relation just fetched
   */
  private toRelation = (relation: Relation, links: StreamLink[] = []) => {
    const relLink = links.find(link => link.relation === relation)
    if (!relLink) {
      return () => Promise.resolve()
    }

    /**
     * We need to update the relation functions as we page through the entries
     */
    return async () => {
      await this.init()
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
  private updateRelations = (links: StreamLink[] = []) => {
    const toRel = (relation: Relation) => this.toRelation(relation, links)
    this.self = toRel('self')
    this.first = toRel('first')
    this.last = toRel('last')
    this.previous = toRel('previous')
    this.next = toRel('next')
  }
}

type StreamPosition =
  | number
  | 'head'