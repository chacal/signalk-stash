#!/usr/bin/env node

/*
 * Usage:
 *    npm run import-log-file <file> <context>
 * Example:
 *    npm run import-log-file sk-deltas.log urn:mrn:imo:mmsi:230099999
 */

import { SKContext } from '@chacal/signalk-ts'
import byline from 'byline'
import { createReadStream } from 'fs'
import _ from 'lodash'
import * as path from 'path'
import DB from '../api-server/db/StashDB'

function runImport(file: string, context: SKContext) {
  console.log(`Importing rows from ${file} with context ${context}`)

  const readStream = byline.createStream(createReadStream(file))

  readStream.pipe(
    DB.deltaWriteStream(() => {
      console.log('Done!')
    })
  )
}

if (process.argv.length < 4) {
  console.log('Usage npm run import-log-file <file> <context>')
  process.exit(1)
} else {
  const [file, context] = _.drop(process.argv, 2)
  runImport(path.resolve(file), context.trim())
}
