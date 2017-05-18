export type Event<TData> = {
    eventType: string
    data: TData
}

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
    uri: string
    relation: Relation
}

export type Relation =
    | 'self'
    | 'first'
    | 'previous'
    | 'next'
    | 'metadata'
    | 'last'
    | 'edit'
    | 'alternate'

export type EventStream<TData> = {
    self: () => Promise<StreamResponse | void>
    next: () => Promise<StreamResponse | void>
    previous: () => Promise<StreamResponse | void>
    first: () => Promise<StreamResponse | void>
    last: () => Promise<StreamResponse | void>
    metadata: () => Promise<StreamResponse | void>
    entries: () => Promise<StreamEventResponse<TData>[]>
    publish: (events: Array<Event<TData>>) => Promise<void>
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

export type StreamEventResponse<TData> =
    StreamEntry
    & {
        content: {
            eventStreamId: string
            eventNumber: number
            eventType: string
            data: TData
            metadata: string
        }
    }