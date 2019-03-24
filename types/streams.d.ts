declare module '@signalk/streams/autodetect' {
  import { Writable } from 'stream'
  export default class Autodetect extends Writable {
    constructor(options?: {})
  }
}

declare module '@signalk/streams/liner' {
  import { Transform } from 'stream'
  export default class Liner extends Transform {}
}

declare module '@signalk/streams/s3' {
  import { Transform } from 'stream'

  interface Options {
    bucket: string
    prefix: string
  }

  export default class S3Provider extends Transform {
    constructor(opts: Options)
  }
}
