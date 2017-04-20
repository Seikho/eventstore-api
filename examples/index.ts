import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({
  path: path.resolve(__dirname, '..', '.env')
})

import { parsers } from 'swm-article-parser'
import * as store from '../src'
import * as fs from 'fs'

const fixturePath = path.resolve(__dirname, 'fixtures')
const xml = fs.readFileSync(path.join(fixturePath, 'test-1.xml')).toString()
const { article } = parsers.newsgate(xml)

function testWrite() {
  const response = store.writeToStream({
    ingestSource: 'Newsgate',
    eventType: 'PublicationPublished',
    data: article
  })
  return response
}

export async function testRun() {
  await testWrite()
  const events = await store.readStream()
  console.log(JSON.stringify(events, null, 2))
}

testRun()