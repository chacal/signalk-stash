#!/usr/bin/env node

/*
* Usage:
*    npm run import-log-file <file> <context>
* Example:
*    npm run import-log-file sk-deltas.log urn:mrn:imo:mmsi:230099999
*/

import byline from 'byline'
import { createReadStream, fstatSync, openSync } from 'fs'
import _ from 'lodash'
import * as path from 'path'
import { Writable } from 'stream'
import db from '../api-server/db'
import SignalKDeltaWriter from '../api-server/delta-writer'

const writer = new SignalKDeltaWriter(db)

function importOneLine(line, context) {
  try {
    const delta = JSON.parse(line)
    return writer.writeDelta(_.assignIn({}, delta, {context}))
  } catch (e) {
    return Promise.reject(e)
  }
}

function runImport(file, context) {
  console.log(`Importing rows from ${file} with context ${context}`)

  const fd = openSync(file, 'r')
  const { size } = fstatSync(fd)
  let progress = 0
  let loggedProgress = 0
  const readStream = byline.createStream(createReadStream(file))

  const dbWriterStrem = new Writable({
    write(chunk, encoding, callback) {
      const line = chunk.toString()
      progress += line.length
      const percentageProgress = Math.floor((progress / size) * 100)
      if (loggedProgress !== percentageProgress) {
        console.log(`${percentageProgress}%`)
        loggedProgress = percentageProgress
      }

      importOneLine(line, context)
        .catch(e => console.error(`Error: ${e.message}, line ${line}`))
        .then(() => callback())
    }
  })

  readStream.pipe(dbWriterStrem)
}

if (process.argv.length < 4) {
  console.log('Usage npm run import-log-file <file> <context>')
  process.exit(1)
} else {
  const [file, context] = _.drop(process.argv, 2)
  runImport(path.resolve(file), context.trim())
}
