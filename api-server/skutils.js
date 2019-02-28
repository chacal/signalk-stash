export function getDollarSource(update) {
  return update['$source'] || getSourceId(update.source)
}

export function getSourceId(source) {
  // console.log(source)
  if (!source) {
    return 'no_source'
  }
  if (source.src || source.pgn) {
    return (
      source.label +
      (source.src ? '.' + source.src : '') +
      (source.instance ? '.' + source.instance : '')
    )
  }
  if (typeof source === 'object') {
    return source.label + (source.talker ? '.' + source.talker : '.XX')
  }
  // source data is actually from $source, not source: {...}
  return source
}
