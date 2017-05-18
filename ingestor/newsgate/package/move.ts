import * as fs from 'fs'
import * as path from 'path'

export default async function (packageLocation: string, destination: string): Promise<void> {
  const content = await readFile(packageLocation)
  const filename = path.basename(packageLocation)
  const newPath = path.join(destination, filename)
  await writeFile(newPath, content)
  await unlink(packageLocation)
}

function readFile(location: string): Promise<Buffer> {
  const promise = new Promise<Buffer>((resolve, reject) => {
    fs.readFile(location, (err, data) => {
      if (err) {
        return reject(err)
      }

      resolve(data)
    })
  })

  return promise
}

function writeFile(location: string, data: Buffer | string): Promise<void> {
  const promise = new Promise<void>((resolve, reject) => {
    fs.writeFile(location, data, (err: Error) => {
      if (err) {
        return reject(err)
      }

      resolve()
    })
  })

  return promise
}

function unlink(location: string): Promise<void> {
  const promise = new Promise<void>((resolve, reject) => {
    fs.unlink(location, (err) => {
      if (err) {
        return reject(err)
      }

      resolve()
    })
  })

  return promise
}