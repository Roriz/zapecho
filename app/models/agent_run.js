const { queryBuilder, BaseModel } = require('./base_model.js');

class AgentRun extends BaseModel {
  static table_name = 'agent_runs';
}

const AgentRunsQuery = () => {
  const query = queryBuilder(AgentRun)

  const originalInsert = query.insert;
  query.insert = async function zeInsert(...args) {
    console.info(JSON.stringify({
      code: 'models/agent_run/insert',
      message: 'Inserting agent run',
      payload: args
    }));
    return originalInsert.bind(this, ...args)();
  };

  return query;
};

module.exports = AgentRunsQuery;
