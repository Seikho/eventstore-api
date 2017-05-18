import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env')
})

import * as store from '../../src'

async function start() {
  const subscription = new store.EventStore<SWMEvent<any> & { id: any }>('publications')
  const start = await subscription.subscribe('publication-handlers')
  for (const e of start.entries) {
    console.log(e.event.id)
  }
}

start()