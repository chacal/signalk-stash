class SignalKDeltaWriter {
  constructor(db) {
    this.db = db
  }

  writeDelta(delta) {
    return this.db.writeDelta(delta)
  }
}

export default SignalKDeltaWriter
