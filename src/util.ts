import request from './request'
import {
  StreamResponse,
  StreamEventResponse,
  StreamEntry,
  Event,
  Atom,
  AtomLink
} from './types'
import * as uuid from 'uuid'

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

export function getStreamURL(host: string, stream: string): string {
  return `${host}streams/${stream}`
}

export async function writeToStream<TData>(host: string, stream: string, events: Array<Event<TData>>) {
  const eventUrl = getStreamURL(host, stream)
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

export async function getAtom<TEvent>(url: string) {
  const response = await request<Atom<TEvent>>(url, jsonHeader)

  const atom = response.body

  atom.ackAll = toMsgAck('ackAll', atom.links)
  atom.nackAll = toMsgAck('nackAll', atom.links)
  atom.previous = toMsgAck('previous', atom.links)
  atom.self = toMsgAck('self', atom.links)

  for (const entry of atom.entries) {
    entry.ack = toMsgAck('ack', entry.links)
    entry.nack = toMsgAck('nack', entry.links)
    const event = await request<TEvent>(entry.id)
    entry.event = event.body
  }

  return atom
}

function toMsgAck(rel: string, links: AtomLink[]) {
  const relLink = links.find(link => link.relation === rel)
  if (!relLink) {
    return () => Promise.reject('No relation found in originating Atom')
  }

  return async () => {
    const response = await request(relLink.uri, jsonHeader)
    return response.body
  }
}

const jsonHeader = {
  headers: {
    'Accept': 'application/vnd.eventstore.competingatom+json'
  }
}