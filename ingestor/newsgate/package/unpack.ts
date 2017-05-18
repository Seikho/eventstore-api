import * as Zip from 'adm-zip'

export default function unpack(packageLocation: string) {
  const archive = new Zip(packageLocation)
  return archive
}
