declare module 'dotenv' {
  namespace api {
    function config(opts?: any): void
  }
  export = api
}

declare module 'xpath' {
  namespace api {
    function select(...args: any[]): any
  }

  export = api
}

declare module 'xmldom' {
  namespace api {
    class DOMParser {
      constructor(...args: any[])
      parseFromString(...args: any[]): any
    }
  }
  export = api
}

