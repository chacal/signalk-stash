#!/usr/bin/env node

import AutoDetect from '@signalk/streams/autodetect'
import Liner from '@signalk/streams/liner'
import S3Stream from '@signalk/streams/s3'
import program from 'commander'
import stashDB from '../api-server/db/StashDB'
import SKDeserializingStream from '../delta-inputs/SKDeserializingStream'

process.stdin.resume()
process.stdin.setEncoding('utf8')

program
  .usage('s3-to-clickhouse --bucket=<bucket> [options]')
  .option('-b, --bucket <required>', 'S3 Bucket')
  .option('--prefix <required>', 'S3 file prefix', '')
program.parse(process.argv)

if (!program.bucket) {
  program.outputHelp()
  process.exit(-1)
}
const liner = new Liner({})
const autodetect = new AutoDetect({ noThrottle: true, app: { signalk: {} } })

const s3Stream = new S3Stream({
  bucket: program.bucket,
  prefix: program.prefix
})

let tsvRowCount = 0
setInterval(() => {
  console.log(tsvRowCount)
}, 1000)
s3Stream.on('finish', () => process.exit(0))

s3Stream
  .pipe(liner)
  .pipe(autodetect)
  .pipe(new SKDeserializingStream())
  .pipe(stashDB.deltaWriteStream())
