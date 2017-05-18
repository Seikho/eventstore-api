import * as dotenv from 'dotenv'
import * as path from 'path'
import { EventStore } from '../../src'

dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env')
})

type SampleEvent = SWMEvent<any> & { id: any }

async function start() {
  const config = {
    host: process.env.JOURNAL_URL,
    stream: 'publications'
  }

  const store = new EventStore<SampleEvent>(config)
  const start = await store.subscribe('publication-handlers')

  for (const e of start.entries) {
    console.log(e.event.id)
  }
}

start()