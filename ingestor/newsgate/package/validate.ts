import { Publication } from 'publication-types'
import { parsers } from 'swm-article-parser'
import { Source } from './source'

/**
 * Ensure articles:
 * - Image references in XML exists in the package
 *
 * And ensure third party articles:
 *  - Have a main image
 */

type ValidateResult = {
  id: string;
  skipReason: string | null;
  heading: string;
  errors: string[]
}

export default function validate(xml: string, source: Source): ValidateResult {

  // Article parsing is also done in the transformer, but can now be done here due to SWM-1224
  const result = parsers.auto(xml)

  const validateResult: ValidateResult = {
    id: (result.article || { id: 'Invalid_ID' }).id,
    heading: '',
    skipReason: null,
    errors: []
  }

  if (result.errors.length > 0) {
    validateResult.errors.push(...result.errors.map(err => err.message))
    return validateResult
  }

  const article = result.article

  // Requested by OPS
  const headingItem = article.items.find(item => item.kind === 'heading') as Publication.Item.Heading
  validateResult.heading = headingItem.text

  if (article.source === 'AAP') {
    const mainImage = article.items.find(item => item.kind === 'main-image')
    if (!mainImage) {
      validateResult.skipReason = 'Third party (AAP) article does not contain a main image'
      return validateResult
    }
  }

  const content = article.items.find(item => item.kind === 'content') as Publication.Item.Content
  const inlineBlocks = content.blocks.filter(block => block.kind === 'inline') as Publication.Block.Inline[]

  const imageEntryExists = (entity: { name: string }): string | void => {
    const asset = article
      .assets
      .find(asset => asset.name === entity.name)

    if (!asset) {
      return `Inline block ('${entity.name}') references an asset that was not provided in the package`
    }

    if (asset.kind === 'video') {
      return
    }

    const hasImage = source.images.some(image => image.name === asset.original.reference)
    if (!hasImage) {
      return `Inline block ('${entity.name}') references an image that was not provided in the package`
    }
  }

  const assetErrors = inlineBlocks
    .map(imageEntryExists)
    .filter(err => !!err) as string[]

  if (assetErrors.length > 0) {
    validateResult.errors.push(...assetErrors)
    return validateResult
  }

  const mainImageItem = article.items.find(item => item.kind === 'main-image') as Publication.Item.MainImage
  if (!mainImageItem) {
    return validateResult
  }

  const mainImageError = imageEntryExists(mainImageItem)
  if (mainImageError !== undefined) {
    validateResult.errors.push(mainImageError)
  }

  return validateResult
}