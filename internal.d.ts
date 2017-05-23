declare module 'xml2json' {
  export function toJson(xml: string): string
  export function toXml(object: {}): string
}

type SWMEvent<T> =
  | ContentPublished<T>
  | ContentKilled
  | ContentRevived

/**
 * A simple proposed event shape to begin negotiating
 */
interface ContentPublished<TContent> {
  /**
   * The ingest source. E.g. Newsgate, Brightcove, NewsCorp, ...
   */
  source: string

  /**
   * Extra source 'metadata' for event consumers to consider when handling events
   */
  tags: string[]

  /**
   * The result of parsing the content
   */
  content: TContent

  /**
   * References to assets for event handlers
   * Ingestors would typically upload assets to a location any event handler can access
   * There should be enough information here for handlers to fetch and consume the asset
   */
  assets: Array<{ filename: string, location: string }>

  /**
   * The original content received
   * This enables event handlers to do their own handling of content
   */
  original: {
    type: string
    content: string
  }
}

type ContentKilled = {
  contentId: string
  reason: string
}

type ContentRevived = {
  contentId: string
  reason: string
}

type Command =
  | PublishContent
  | KillContent
  | ReviveContent

type PublishContent = {
  type: 'PublishContent',
  contentId: string,
  source: string
  tags: string[]
  content: any
  assets: Array<{ filename: string, location: string }>
  original: {
    type: string
    content: string
  }
}

type KillContent = {
  type: 'KillContent'
  contentId: string
  reason: string
}

type ReviveContent = {
  type: 'ReviveContent',
  contentId: string
  reason: string
}