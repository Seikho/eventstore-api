import * as uuid from 'uuid'
import request from './request'
import {
  AtomOptions,
  StreamLink,
  EventStream,
  Relation,
  Event,
  StreamEntry,
  Credentials,
  StreamMetadataOptions,
  EventStoreOptions,
  SubscribeOptions,
} from './types'

import {
  getStreamResponse,
  normaliseUrl,
  writeToStream,
  getAtom
} from './util'

type StreamRequester<TEvent> = () => Promise<EventStream<TEvent>>

export class EventStore<TData> {
  private stream: string
  private host: string
  private credentials: Credentials = {}

  self: StreamRequester<TData> = () => Promise.reject('Store not yet initialised')
  next: StreamRequester<TData> = () => Promise.reject('Store not yet initialised')
  previous: StreamRequester<TData> = () => Promise.reject('Store not yet initialised')
  first: StreamRequester<TData> = () => Promise.reject('Store not yet initialised')
  last: StreamRequester<TData> = () => Promise.reject('Store not yet initialised')
  entries: Array<StreamEntry<TData>> = []

  constructor(options: EventStoreOptions) {
    this.host = normaliseUrl(options.host)
    this.stream = options.stream
    this.credentials = options.credentials || {}
  }

  async postStreamMetadata(options: StreamMetadataOptions) {
    try {

      // This will throw if the stream does not exist
      await getStreamResponse(`${this.host}streams/${this.stream}`)
      return
    } catch (ex) {
      // TODO: Pass credentials through in request
      const url = `${this.host}streams/${this.stream}/metadata`
      const event = {
        eventId: uuid.v4(),
        eventType: '$user-updated',
        data: options,
      }

      const response = await request(url,
        {
          body: JSON.stringify([event]),
          method: 'POST',
          headers: { 'Content-Type': 'application/vnd.eventstore.events+json' },
          auth: this.credentials
        })
      return response
    }
  }

  subscribe = async (group: string, options: AtomOptions = {}) => {
    const url = `${this.host}subscriptions/${this.stream}/${group}`
    const response = await getAtom<TData>(url, {
      host: this.host,
      stream: this.stream,
      credentials: this.credentials,
      group,
      ...options
    })
    return response
  }

  createSubscription = async (group: string, options: SubscribeOptions = {}) => {
    const url = `${this.host}subscriptions/${this.stream}/${group}`
    const requestOptions = {
      method: 'PUT',
      body: JSON.stringify({ ...defaultSubscriberOptions, ...options }),
      auth: this.credentials,
      headers: { 'Content-Type': 'application/json' }
    }

    if (!this.credentials.user || !this.credentials.pass) {
      delete requestOptions.auth
    }

    const response = await request<void>(url, requestOptions)
    if (response.statusCode === 201) {
      return true
    }

    throw new Error(`Failed to create subscription -- Status code: ${response.statusCode}`)
  }

  publish = async (events: Array<Event<TData>>) => {
    return writeToStream(this.host, this.stream, events)
  }

  /**
   * This will read the stream from the position and adjust the relation functions
   * to be relative to the new position
   */
  async forwardFrom(fromPosition: StreamPosition, amount: number = 20) {
    const url = `${this.host}streams/${this.stream}/${fromPosition}/forward/${amount}`
    const response = await getStreamResponse<TData>(url)
    this.entries = response.entries
    this.updateRelations(response.links)
    return response
  }

  /**
   * This will read the stream from the position and adjust the relation functions
   * to be relative to the new position
   */
  async backwardFrom(fromPosition: StreamPosition, amount: number = 20) {
    const url = `${this.host}streams/${this.stream}/${fromPosition}/backward/${amount}`
    const response = await getStreamResponse<TData>(url)
    this.entries = response.entries
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
      return () => Promise.reject(`Stream has no relation '${relation}'`)
    }

    /**
     * We need to update the relation functions as we page through the entries
     */
    return async () => {
      const response = await getStreamResponse<TData>(relLink.uri)
      response.entries = response.entries.sort((left, right) => left.eventNumber - right.eventNumber)

      for (const entry of response.entries) {
        entry.event = JSON.parse(entry.data)
      }

      this.entries = response.entries
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

const defaultSubscriberOptions: SubscribeOptions = {
  bufferSize: 500,
  checkPointAfterMilliseconds: 1000,
  extraStatistics: false,
  liveBufferSize: 500,
  maxCheckPointCount: 500,
  maxRetryCount: 10,
  maxSubscriberCount: 10,
  messageTimeoutMilliseconds: 10000,
  minCheckPointCount: 10,
  namedConsumeStrategy: 'RoundRobin',
  readBatchSize: 20,
  resolveLinktos: false,
  startFrom: 0
}

type StreamPosition =
  | number
  | 'head'