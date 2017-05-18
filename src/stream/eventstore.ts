import { getHostUrl } from '../config'
import request from '../request'

export class EventStore<TEvent> {
  constructor(public stream: string) {

  }

  subscribe = async (group: string) => {
    const url = `${getHostUrl()}subscriptions/${this.stream}/${group}`
    const response = await get<TEvent>(url)
    return response
  }
}

type AtomLink = {
  uri: string
  relation: string
}

type AtomEntry<TEvent> = {
  id: string
  title: string
  headOfStream: boolean
  links: AtomLink[]

  /** ISO string */
  updated: string
  author: {
    name: string
  }
  summary: string
  ack: () => Promise<void>
  nack: () => Promise<void>
  event: TEvent
}

type Atom<TEvent> = {
  id: string
  title: string
  links: AtomLink[]

  /** ISO string */
  updated: string
  author: {
    name: string
  }
  entries: AtomEntry<TEvent>[]

  ackAll: () => Promise<void>
  nackAll: () => Promise<void>
  previous: () => Promise<Atom<TEvent>>
  self: () => Promise<Atom<TEvent>>
}

async function get<TEvent>(url: string) {
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