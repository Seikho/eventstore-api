export type CreateSubsciptionOptions = {
    readRole: string
    metaReadRole: string
}

export type EventStoreOptions = {
    host: string
    stream: string
    createStream?: CreateSubsciptionOptions
    credentials?: Credentials
}

export type SubscribeOptions = {
    bufferSize?: number
    checkPointAfterMilliseconds?: number
    extraStatistics?: boolean
    liveBufferSize?: number
    maxCheckPointCount?: number
    maxRetryCount?: number
    maxSubscriberCount?: number
    messageTimeoutMilliseconds?: number
    minCheckPointCount?: number
    namedConsumeStrategy?: 'RoundRobin' | 'Pinned' | 'DispatchToSingle'
    readBatchSize?: number
    resolveLinktos?: boolean
    startFrom?: number
}


export type Event<TData> = {
    eventType: string
    data: TData
}

export type EventStream<TEvent> = {
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
    entries: StreamEntry<TEvent>[]
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

export type StreamEntry<TEvent> = {
    title: string
    id: string
    eventId: string
    eventNumber: number
    data: string
    event: TEvent
    isJson: boolean
    isLinkMetadata: boolean
    isMetadata: boolean
    positionEventNumber: boolean
    positionStreamId: string
    streamId: string
    updated: string
    author: {
        name: string
    }
    summary: string
    links: StreamLink[]
}

export type AtomLink = {
    uri: string
    relation: string
}

export type AtomEntry<TEvent> = {
    id: string
    eventId: string
    eventNumber: number

    /** Stringified representation of event */
    data: string

    event: TEvent

    isJson: boolean
    isLinkMetadata: boolean
    isMetadata: boolean
    positionEventNumber: number
    positionStreamId: string
    streamId: string
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
    nack: (action: AtomNackAction) => Promise<void>
}

export interface Atom<TEvent> {
    id: string
    title: string
    links: AtomLink[]
    headOfStream: boolean

    /** ISO string */
    updated: string

    author: {
        name: string
    }

    embed: AtomEmbed
    count: number
    atomUrl: string

    entries: Array<AtomEntry<TEvent>>

    ackAll: () => Promise<void>
    nackAll: (action: AtomNackAction) => Promise<void>
    previous: (options?: InternalAtomOptions) => Promise<Atom<TEvent>>
    self: (options?: InternalAtomOptions) => Promise<Atom<TEvent>>
    replayParked: () => Promise<void>
}

export type InternalAtomOptions = {
    host: string
    stream: string
    group: string
    credentials: Credentials
}

export type Credentials = {
    user?: string
    pass?: string
}

export type AtomOptions = {
    count?: number
}

export type AtomEmbed = 'None' | 'Content' | 'Rich' | 'Body' | 'PrettyBody' | 'TryHarder'

export type AtomNackAction = 'Park' | 'Retry' | 'Skip' | 'Stop'