import createStream from './factory'
export { Subscribe } from './subscribe'

export default async function getStream<TData>(streamName: string) {
  return createStream<TData>(streamName)
}

