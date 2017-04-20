import { Publication } from 'publication-types'

type EventPublication =
    | Publication.Video
    | Publication.Article
    | Publication.Video

export type Event<TEvent extends string, TData extends object> = {
    ingestSource: string
    eventType: TEvent
    data: TData
}

export type EventType = ValidEvent['eventType']

export type ValidEvent =
    | PublicationPublished

export type PublicationPublished = Event<'PublicationPublished', EventPublication>

export type StreamResponse = {
    title: string
    id: string
    updated: string
    streamId: string
    author: {
        name: string
    }
    headOfStream: boolean
    selfUrl: string
    eTag: string
    links: StreamLink[]
    entries: StreamEntry[]
}

export type StreamLink = {
    url: string
    relation: string
}

export type StreamEntry = {
    title: string
    id: string
    updated: string
    author: {
        name: string
    }
    summary: string
    links: StreamLink[]
}

export type StreamEventResponse<TEvent extends string, TData extends object> =
    StreamEntry
    & {
        content: {
            eventStreamId: string
            eventNumber: number
            eventType: TEvent
            data: TData
            metadata: string
        }
    }