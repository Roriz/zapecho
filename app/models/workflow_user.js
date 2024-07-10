const { queryBuilder, BaseModel } = require('./base_model.js');

class WorkflowUser extends BaseModel {
  static table_name = 'workflow_users';

  user_id;
  workflow_id;
  status;
  finished_at;
  answers_data;
  openai_thread_id;

  addAnswerData(data) {
    return this.updateOne(this, {
      answers_data: {
        ...this.answers_data,
        ...data
      }
    });
  }
}
const WorkflowUsersQuery = () => queryBuilder(WorkflowUser);

module.exports = WorkflowUsersQuery;
