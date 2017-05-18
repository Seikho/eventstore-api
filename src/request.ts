import * as request from 'request'

type Response<T> = {
  headers: { [key: string]: string },
  statusCode: number
  body: T
}

export default function requestToPromise<TBody>(uri: string, options: request.CoreOptions = {}): Promise<Response<TBody>> {
  const promise = new Promise((resolve, reject) => {
    request(uri, options, (err, res, body) => {
      if (err) {
        return reject(err)
      }

      resolve({
        headers: res.headers,
        statusCode: res.statusCode,
        body: parseBody(body),
      })
    })
  })

  return promise
}

function parseBody(body: any): any {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch (_) {
      return body
    }
  }

  return body
}