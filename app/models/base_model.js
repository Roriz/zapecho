const { db } = require('#/configs/database.js');

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

  query.updateOne = async function updateOne(modelInstance, paramsToUpdate) {
    await this.where('id', modelInstance.id).update(paramsToUpdate);
    
    return {
      ...modelInstance,
      ...paramsToUpdate,
      updated_at: new Date(),
    };
  };

  query.findOne = async function findOne(...args) {
    return this.where(...args).first();
  }

  return query;
}

module.exports = getDb;
