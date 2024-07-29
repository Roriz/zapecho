const { queryBuilder, BaseModel } = require('./base_model.js');

class WorkflowUser extends BaseModel {
  static table_name = 'workflow_users';

  addAnswerData(data) {
    return queryBuilder(WorkflowUser).updateOne(this, {
      answers_data: {
        ...this.answers_data,
        ...data
      }
    });;
  }
}
const WorkflowUsersQuery = () => queryBuilder(WorkflowUser);

module.exports = WorkflowUsersQuery;
