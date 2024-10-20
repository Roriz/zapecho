const { queryBuilder, BaseModel } = require('./base_model.js');

class WorkflowUser extends BaseModel {
  static table_name = 'workflow_users';

  async addAnswerData(data) {
    if (Object.keys(data).length === 0) return this;

    const workflowUser = await queryBuilder(WorkflowUser).updateOne(this, {
      answers_data: {
        ...this.answers_data,
        ...data
      }
    });

    return workflowUser;
  }

  get current_step_messages_count() {
    return this.statistics[`messages_${this.current_step}_count`] || 0;
  }
}
const WorkflowUsersQuery = () => queryBuilder(WorkflowUser);

module.exports = WorkflowUsersQuery;
