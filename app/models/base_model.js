const { db } = require('#/configs/database.js');

function queryBuilder(Model) {
  const knex = db();
  const query = knex(Model.table_name);

  const originalQuery = knex.client.query;
  knex.client.query = async function zeQuery(...args) {
    const result = await originalQuery.call(this, ...args);

    result.response.rows = result.response.rows.map(row => new Model(row));
    
    return result;
  }

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

class BaseModel {
  id;
  created_at;
  updated_at;
  table_name;

  constructor(data) {
    Object.assign(this, data);
  }
}

module.exports = {
  queryBuilder,
  BaseModel
};
