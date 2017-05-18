/**
 * This is likely to grow over time
 */
class Config {
  static hostUrl: string = process.env.JOURNAL_URL
}

/*
 * @param hostUrl Full base URL with protocol included. E.g. http://localhost:3141
 */
export function setHostUrl(hostUrl: string): void {
  const lastChar = hostUrl.slice(-1)
  Config.hostUrl = lastChar === '/'
    ? hostUrl
    : hostUrl + '/'
}

export function getHostUrl(): string {
   if (!Config.hostUrl) {
    throw new Error('Configuration Error: Host URL not set yet')
  }

  return Config.hostUrl
}