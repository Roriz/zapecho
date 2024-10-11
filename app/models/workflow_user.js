const { queryBuilder, BaseModel } = require('./base_model.js');

class WorkflowUser extends BaseModel {
  static table_name = 'workflow_users';

  async addAnswerData(data) {
    if (Object.keys(data).length === 0) return this;
    console.debug(JSON.stringify({ code: 'workflow_user_add_answer', data }));

    const workflowUser = await queryBuilder(WorkflowUser).updateOne(this, {
      answers_data: {
        ...this.answers_data,
        ...data
      }
    });

    return workflowUser;
  }
}
const WorkflowUsersQuery = () => queryBuilder(WorkflowUser);

module.exports = WorkflowUsersQuery;
