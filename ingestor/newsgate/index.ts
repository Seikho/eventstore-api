import * as path from 'path'
import * as chokidar from 'chokidar'
import processPackage from './package'

const watchPath = path.resolve(process.env.INBOX_DIRECTORY, '*.zip')
const watcher = chokidar.watch(
  watchPath,
  {awaitWriteFinish: true}
)

watcher.on('ready', () => {
  console.log(`[INGESTOR:Newsgate] Watching for packages in ${watchPath}`)
})

watcher.on('add', (location: string) => {
  processPackage(location)
})