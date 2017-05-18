import { EventStore } from '../src'

export async function testRun() {
  const store = new EventStore({
    host: process.env.JOURNAL_URL,
    stream: 'publications'
  })

  const entries = await store.entries()
  return entries
}

testRun()