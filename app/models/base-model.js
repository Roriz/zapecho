const { db } = require('../../configs/database.js');

function getDb(tableName) {
  const query = db()(tableName);

  // Overwrite the insert method to include created_at and updated_at fields
  const originalInsert = query.insert;
  query.insert = async function zeInsert(...args) {
    this.returning('*');
    const result = await originalInsert.bind(this, {
      created_at: new Date(),
      updated_at: new Date(),
      ...args[0],
    }, ...args.slice(1))();

    return result[0];
  };

  return query;
}

module.exports = getDb;
