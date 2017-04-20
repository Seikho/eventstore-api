import { expect } from 'chai'
import { getHostUrl, setHostUrl } from '../src/config'

const fixtures = [
  {
    will: 'append a trailing slash to host URL',
    initial: 'http://localhost',
    expected: 'http://localhost/'
  },
  {
    will: 'not append a trailing slash to host URL if one is provided',
    initial: 'http://localhost/',
    expected: 'http://localhost/'
  }
]

describe('Configuration', () => {
  it('will throw when getting an unset host URL', () => {
    const getFn = () => getHostUrl()
    expect(getFn).to.throw()
  })

  for (const fixture of fixtures) {
    it(`will ${fixture.will}`, () => {
      setHostUrl(fixture.initial)
      expect(getHostUrl()).to.equal(fixture.expected)
    })
  }
})