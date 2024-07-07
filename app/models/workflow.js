const { queryBuilder, BaseModel } = require('./base_model.js');

class Workflow extends BaseModel {
  static table_name = 'workflows';

  name;
  description;
  first_message;
}

const WorkflowsQuery = () => queryBuilder(Workflow);

module.exports = WorkflowsQuery;
