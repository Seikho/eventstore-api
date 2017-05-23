import * as dotenv from 'dotenv'
import * as path from 'path'
import { EventStore } from '../../src'
import { Atom } from '../../src/types'

dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env')
})

type SampleEvent = ContentPublished<any>

const store = new EventStore<SampleEvent>({
  host: process.env.JOURNAL_URL,
  stream: 'publications',
  credentials: {
    user: 'admin',
    pass: 'changeit'
  }
})

async function start(atom?: Atom<any>) {
  if (!atom) {
    atom = await getSubscription('test-1')
  }

  if (atom.entries.length === 0) {
    console.log('Finished catching up')
    return
  }

  await atom.ackAll()
  console.log('Acknowledged', JSON.stringify(atom.entries.map(entry => entry.eventNumber)))

  start(await atom.previous())
}

async function getSubscription(groupName: string) {
  try {

    // If the subscription does not exist, try and create it
    return await store.subscribe(groupName, { count: 20 })
  } catch (ex) {

    // Failing to create it will throw so we can assume the next line will succeed
    // if creating doesn't throw
    await store.createSubscription(groupName)
    console.log('Created subscription', groupName)
    return await store.subscribe(groupName, { count: 20 })
  }
}


start()