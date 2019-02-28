export function dbIdLookup(db, tableName, fieldName) {
  const lookupObject = {}
  const insertStmt = `WITH insertedId AS(
    INSERT INTO ${tableName} (${fieldName})
      VALUES($1) 
      ON CONFLICT DO NOTHING
      RETURNING id )
    SELECT id
    FROM
      insertedId
      UNION
      SELECT id
      FROM ${tableName}
      WHERE ${fieldName} = $1`

  return value => {
    const idP = lookupObject[value]
    if (typeof idP !== 'undefined') {
      return idP
    }
    return (lookupObject[value] = db
      .one(insertStmt, [value])
      .then(({ id }) => id)).then(id => {
      return id
    })
  }
}
