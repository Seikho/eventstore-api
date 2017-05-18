import * as store from '../src'

export async function testRun() {
  const stream = await store.getStream('publications')

  const entries = await stream.entries()
  return entries
}

testRun()