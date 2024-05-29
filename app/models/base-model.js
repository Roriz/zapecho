import db from '../../configs/database.js';

export default function getDb(tableName) {
  const query = db()(tableName);
  const originalInsert = query.insert;
  query.insert = (...args) => {
    console.log('Inserting a user');
    originalInsert(...args);
  };

  return query;
}
