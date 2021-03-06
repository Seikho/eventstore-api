import request from './request'
import {
  EventStream,
  Event,
  Atom,
  AtomLink,
  InternalAtomOptions,
  AtomOptions,
  AtomNackAction,
} from './types'

const uuid = require('uuid')

export function normaliseUrl(url: string) {
  const isSlash = url.slice(-1) === '/'
  return isSlash
    ? url
    : url + '/'
}

export async function getStreamResponse<TEvent>(uri: string): Promise<EventStream<TEvent>> {
  const response = await request<EventStream<TEvent>>(`${uri}?embed=tryharder`, {
    headers: {
      'Accept': 'application/vnd.eventstore.atom+json'
    }
  })

  if (response.statusCode >= 400) {
    throw new Error(`Failed to retrieve stream -- Error code: ${response.statusCode}`)
  }

  const stream = response.body

  const entries = stream.entries || []
  for (const entry of entries) {
    entry.event = JSON.parse(entry.data)
  }

  return stream
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

/**
 * TODO: Fix passing/handling options to things that care
 */
export async function getAtom<TEvent>(url: string, options: InternalAtomOptions & AtomOptions) {
  const count = options.count ? `/${options.count}` : ''
  const atomUrl = `${url}${count}?embed=TryHarder`
  const response = await request<Atom<TEvent>>(atomUrl, {
    headers: {
      'Accept': 'application/vnd.eventstore.competingatom+json'
    }
  })

  if (response.statusCode >= 400) {
    throw new Error(`Failed to retrieve subscription - Error Code: ${response.statusCode}`)
  }

  const atom = response.body

  const toAtom = (relation: string) => {
    const link = atom.links.find(link => link.relation === relation)

    if (!link) {
      return () => Promise.reject('No relation found in originating Atom')
    }

    return async (atomOptions: InternalAtomOptions) => {
      const atom = await getAtom(link.uri, {
        host: options.host,
        stream: options.stream,
        group: options.group,
        credentials: options.credentials,
        ...atomOptions
      })
      return atom
    }
  }

  atom.ackAll = toMsgAck('ackAll', atom.links)
  atom.nackAll = toMsgAck('nackAll', atom.links)
  atom.previous = toAtom('previous')
  atom.self = toAtom('self')
  atom.replayParked = () => replayParked(options)

  for (const entry of atom.entries) {
    entry.ack = toMsgAck('ack', entry.links)
    entry.nack = toMsgAck('nack', entry.links)
    entry.event = JSON.parse(entry.data)
  }

  atom.entries = atom.entries.sort((left, right) => left.eventNumber - right.eventNumber)
  return atom
}

function toMsgAck(rel: string, links: AtomLink[]) {
  const relLink = links.find(link => link.relation === rel)
  if (!relLink) {
    return () => Promise.reject('No relation found in originating Atom')
  }

  return async (action?: AtomNackAction) => {
    const ackUri = action ?
      `${relLink.uri}?action=${action}`
      : relLink.uri

    const response = await request(ackUri, {
      headers: {
        'Content-Type': 'applicaiton/json'
      },
      method: 'POST'
    })
    return response.body
  }
}

async function replayParked(options: InternalAtomOptions) {
  const replayUrl = `${options.host}subscriptions/${options.stream}/${options.group}/replayParked`
  const response = await request<any>(replayUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json'
    },
    auth: options.credentials
  })

  if (response.statusCode >= 200 && response.statusCode < 300) {
    return
  }

  throw new Error(`Failed to replay parked message -- Status code ${response.statusCode}`)
}