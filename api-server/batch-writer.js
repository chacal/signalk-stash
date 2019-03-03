const Transform = require('stream').Transform
require('util').inherits(ToTimeScaleDb, Transform)

function ToTimeScaleDb(db, batchSize = 1000) {
  Transform.call(this, {
    objectMode: true
  })
  this.db = db
  this.insertsData = db.deltaToInsertsData({})
  this.batchSize = batchSize
  this.previousInsert = Promise.resolve()
}

ToTimeScaleDb.prototype._transform = function(delta, encoding, done) {
  this.insertsData = this.db.deltaToInsertsData(delta, this.insertsData)
  if (this.insertsData.count > this.batchSize) {
    const insertsData = this.insertsData
    this.insertsData = undefined
    this.previousInsert.then(() => {
      done()
    })
    this.previousInsert = this.db.writeInsertsData(insertsData)
  } else {
    done()
  }
}

module.exports = ToTimeScaleDb
