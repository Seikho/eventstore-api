import * as dotenv from 'dotenv'
import * as path from 'path'
import { EventStore } from '../src'
import { EventStream } from '../src/types'

dotenv.config({
  path: path.resolve(__dirname, '..', '.env')
})

const store = new EventStore({
  host: process.env.JOURNAL_URL,
  stream: 'publications'
})

export async function testRun() {
  const stream = await store.last()
  iterate(stream)
}

async function iterate(stream: EventStream<any>) {
  if (stream.entries.length === 0) {
    console.log('Finishing parsing stream')
    return
  }

  console.log('Parsed', JSON.stringify(stream.entries.map(e => e.eventNumber)))
  iterate(await store.previous())
}

testRun()