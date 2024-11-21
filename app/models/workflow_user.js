const { queryBuilder, BaseModel } = require('./base_model.js');

function isEmpty(value) {
  return value === null || value === undefined || value === ''
    || value === 'null' || value === 'undefined' || value === 'none'
    || (Array.isArray(value) && value.length === 0)
    || (typeof value === 'object' && Object.keys(value).length === 0);
}

class WorkflowUser extends BaseModel {
  static table_name = 'workflow_users';

  async addAnswerData(newAnswerData) {
    const filledKeys = Object.keys(newAnswerData).filter(key => !isEmpty(newAnswerData[key]));

    if (Object.keys(filledKeys).length === 0) return this;

    const filledNewAnswerData = filledKeys.reduce((acc, key) => ({ ...acc, [key]: newAnswerData[key] }), {});

    const workflowUser = await queryBuilder(WorkflowUser).updateOne(this, {
      answers_data: {
        ...this.answers_data,
        ...filledNewAnswerData
      }
    });

    return workflowUser;
  }

  async delAnswerData(keys) {
    keys = Array.isArray(keys) ? keys : [keys];
    if (keys.length === 0) return this;

    const answersData = { ...this.answers_data };
    keys.forEach(key => delete answersData[key]);

    const workflowUser = await queryBuilder(WorkflowUser).updateOne(this, { answers_data: answersData });

    return workflowUser;
  }

  get current_step_messages_count() {
    return this.statistics[`messages_${this.current_step}_count`] || 0;
  }
}
const WorkflowUsersQuery = () => queryBuilder(WorkflowUser);

module.exports = WorkflowUsersQuery;
