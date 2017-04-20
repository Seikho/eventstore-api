import request from './request'
import { ValidEvent, StreamResponse } from 'types'
import { getHostUrl } from './config'
import { PUBLICATION } from './stream'
import * as uuid from 'uuid'

export function writeToStream(event: ValidEvent) {
    const eventUrl = getStreamURL(PUBLICATION)
    const method = 'POST'
    const body = [{
        data: { ...event.data, ingestSource: event.ingestSource },
        eventType: event.eventType,
        eventId: uuid.v4()
    }]

    return request(eventUrl, {
        method,
        body: JSON.stringify(body),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/vnd.eventstore.events+json',
        }
    })
}

export async function readStream(): Promise<StreamResponse> {
    const url = getStreamURL(PUBLICATION)
    const response = await request(url, {
        headers: {
            'Accept': 'application/vnd.eventstore.atom+json'
        }
    })
    return JSON.parse(response.body)
}

// export function defineStream() {
//     const metadata = {
//         eventId: uuid.v4(),
//         eventType: '$user-updated',
//         data: {
//             readRole: '$all',
//             metaReadRole: '$all'
//         }
//     }
// }

function getStreamURL(streamName: string): string {
    const baseUrl = getHostUrl()
    return `${baseUrl}streams/${streamName}`
}