#!/usr/bin/env node

import AutoDetect from '@signalk/streams/autodetect'
import Liner from '@signalk/streams/liner'
import S3Stream from '@signalk/streams/s3'
import program from 'commander'
import { Transform } from 'stream'
import { createGunzip } from 'zlib'
import stashDB from '../api-server/db/StashDB'
import SKDeserializingStream from '../delta-inputs/SKDeserializingStream'

process.stdin.resume()
process.stdin.setEncoding('utf8')

program
  .usage('s3-to-clickhouse --bucket=<bucket> [options]')
  .option('-b, --bucket <required>', 'S3 Bucket')
  .option('--prefix <required>', 'S3 file path prefix')
  .option(
    '--selfVesselId <required>',
    'Vessel id without prefix, eg. urn:mrn:signalk:uuid:2204ae24-c911-5ffe-4d1d-4d411c9cea2e'
  )
  .option('-A --all [true]', 'import all data (default: only self)')
  .option('-z --gzip [true]', 'data is gzipped (default: not compressed)')
program.parse(process.argv)

if (!program.bucket) {
  program.outputHelp()
  process.exit(-1)
}
const liner = new Liner({})
const autodetect = new AutoDetect({
  noThrottle: true,
  // tslint:disable-next-line: no-empty
  app: { signalk: {}, emit: () => {} }
})

const uuidPattern = /^urn:mrn:signalk:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ABab][0-9a-f]{3}-[0-9a-f]{12}$/
const mmsiPattern = /^urn:mrn:imo:mmsi:[2-7][0-9]{8}$/

if (
  !uuidPattern.test(program.selfVesselId) &&
  !mmsiPattern.test(program.selfVesselId)
) {
  console.error(
    'Self is not a Signal K uuid nor a proper mmsi id, check format:'
  )
  console.error(program.selfVesselId)
  console.error(
    'urn:mrn:signalk:uuid:________-____-4___-X___-________ where X is 89ABab'
  )
  console.error('urn:mrn:imo:mmsi:________')
  process.exit(-2)
}

const s3Stream = new S3Stream({
  bucket: program.bucket,
  prefix: program.prefix
})

let tsvRowCount = 0
setInterval(() => {
  console.log(tsvRowCount)
}, 1000)
s3Stream.on('finish', () => process.exit(0))

const deltaWriteStream = stashDB.deltaWriteStream()
deltaWriteStream.on('deltaProcessed', () => tsvRowCount++)

class SetSelfVesselId extends Transform {
  readonly selfId: string
  readonly isSelf: (delta: any) => boolean
  readonly importAll: boolean

  constructor(selfVesselId: string, importAll?: boolean) {
    super({ objectMode: true })
    this.selfId = 'vessels.' + selfVesselId
    this.importAll = importAll !== undefined
    this.isSelf = (delta: any) =>
      !delta.context ||
      delta.context === this.selfId ||
      delta.context === 'self' ||
      delta.context === 'vessels.self'
  }

  _transform(delta: any, encoding: string, cb: () => void) {
    if (this.isSelf(delta)) {
      delta.context = this.selfId
      this.push(delta)
    } else if (this.importAll) {
      this.push(delta)
    }
    cb()
  }
}

class FixData extends Transform {
  constructor() {
    super({ objectMode: true })
  }
  _transform(delta: any, encoding: string, cb: () => void) {
    if (
      delta.updates &&
      delta.updates[0].source &&
      delta.updates[0].source.venusPath
    ) {
      const source = delta.updates[0].source
      delta.updates[0].$source = `${source.label}`
      delete delta.updates[0].source
    }
    this.push(delta)
    cb()
  }
}

class FixVenus extends Transform {
  constructor() {
    super({ objectMode: true })
  }
  _transform(line: any, encoding: string, cb: () => void) {
    this.push(line.replace(';venus;', ';S;'))
    cb()
  }
}

const setSelfVesselId = new SetSelfVesselId(program.selfVesselId, program.all)

const datastream = program.gzip ? s3Stream.pipe(createGunzip()) : s3Stream

datastream
  .pipe(liner)
  .pipe(new FixVenus())
  .pipe(autodetect)
  .pipe(new FixData())
  .pipe(new SKDeserializingStream())
  .pipe(setSelfVesselId)
  .pipe(deltaWriteStream)
