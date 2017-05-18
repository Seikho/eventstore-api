import * as path from 'path'
import * as AdmZip from 'adm-zip'
import { extname } from 'path'

export interface Source {
  kind: string
  xml: string
  images: Image[]
}

interface Image {
  name: string
  type: string
  entry: AdmZip.IZipEntry
}

export default async function getSource(archive: AdmZip): Promise<Source | null> {
  const entries = archive.getEntries()
  const aapSource = await getAapSource(archive, entries)

  if (aapSource) {
    return aapSource
  }

  const newsgateSource = await getNewsgateSource(archive, entries)
  if (newsgateSource) {
    return newsgateSource
  }

  return null
}

async function getAapSource(archive: AdmZip, entries: AdmZip.IZipEntry[]): Promise<Source | null> {
  const source = entries.find(entry => {
    return entry.entryName.toLowerCase().indexOf('du:aap') > -1
  })

  if (!source) {
    return null
  }

  const kind = 'aap'
  const name = source.entryName
  const xml = await getXml(archive, name)

  const images: Image[] = []
  for (const entry of entries) {
    const type = getContentType(entry.entryName)
    if (!type) {
      continue
    }

    const name = entry.entryName
    images.push({ name, entry, type })
  }

  return {
    kind,
    xml,
    images
  }
}

async function getNewsgateSource(archive: AdmZip, entries: AdmZip.IZipEntry[]): Promise<Source | null> {
  const xmlFile = entries.find(entry => extname(entry.entryName).toLowerCase() === '.xml')
  const orgFile = entries.find(entry => extname(entry.entryName).toLowerCase() === '.org')

  if (!xmlFile || !orgFile) {
    return null
  }

  const name = xmlFile.entryName
  let xml = await getXml(archive, name)

  const kind = 'newsgate'
  const images: Image[] = []
  for (const entry of entries) {
    const type = getContentType(entry.entryName)
    if (!type) {
      continue
    }

    const originalName = entry.entryName
    const name = normaliseNewsgateImageName(entry.entryName)
    xml = xml.split(originalName).join(name)
    images.push({ name, entry, type })
  }


  return {
    kind,
    xml,
    images
  }
}

function getContentType(fileName: string) {
  switch (path.extname(fileName)) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    default:
      return null
  }
}

function getXml(archive: AdmZip, name: string): Promise<string> {
  return new Promise((resolve, reject) => {
    archive.readAsTextAsync(name, data => {
      if (!data) {
        return reject('Failed to read XML: AdmZip failed')
      }

      // Remove excess whitespace
      const sanitisedData = data
        .replace('/\n/g', '')
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
      resolve(sanitisedData)
    })
  })
}

/**
 * Flatten BUDGET-ID_TIMESTAMP_000+IMAGE-ID.1-x.TYPE to IMAGE-ID.1-x.TYPE
 */
function normaliseNewsgateImageName(filename: string): string {
  const sections = filename.split('+')
  if (sections.length === 2) {
    return sections[1]
  }
  return filename
}