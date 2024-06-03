import { db } from '../../configs/database.js';

export default function getDb(tableName) {
  const query = db()(tableName);
  const originalInsert = query.insert;
  query.insert = function zeInsert(...args) {
    return originalInsert.bind(this, {
      created_at: new Date(),
      updated_at: new Date(),
      ...args[0],
    }, ...args.slice(1))();
  };

  return query;
}
