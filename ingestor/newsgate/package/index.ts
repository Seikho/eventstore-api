import unpack from './unpack'
import getSource from './source'
import movePackage from './move'
import validate from './validate'
import { processOne } from '../../../command-handler'
import * as ap from 'swm-article-parser'

const DONE_DIRECTORY = process.env.DONE_DIRECTORY
const ERROR_DIRECTORY = process.env.ERROR_DIRECTORY


export default async function processPackage(packageLocation: string): Promise<boolean> {
  try {
    await validatePackage(packageLocation)
    await movePackage(packageLocation, DONE_DIRECTORY)
    return true
  } catch (err) {
    await movePackage(packageLocation, ERROR_DIRECTORY)
    return false
  }
}

async function validatePackage(packageLocation: string): Promise<void> {
  const archive = unpack(packageLocation)
  const source = await getSource(archive)

  if (!source) {
    throw new Error('No XML source found in article package')
  }

  const xmlData = source.xml

  const validationResult = validate(xmlData, source)
  if (validationResult.errors.length > 0) {
    throw new Error(`Failed to validate article: ${validationResult.errors.join('\n')}`)
  }

  if (validationResult.skipReason) {
    throw new Error(`Article skipped: ${validationResult.skipReason}`)
  }

  const content = ap.parsers.auto(source.xml).article

  return processOne(
    {
      type: 'PublishContent',
      contentId: content.id,
      source: 'Newsgate',
      tags: [source.kind],
      content,
      assets: source.images.map(i => ({ filename: i.name, location: '' })),
      original: {
        type: 'newsgate+xml',
        content: source.xml
      }
    })
}

