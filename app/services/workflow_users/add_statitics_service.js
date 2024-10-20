const WorkflowUsers = require('~/models/workflow_user.js');

module.exports = {
  addStatiticsService: async function addStatiticsService(workflowUser) {
    const statistics = workflowUser.statistics || {};
    
    const statusCountColumn = `messages_${workflowUser.status}_count`;
    if (!(statusCountColumn in statistics)) { statistics[statusCountColumn] = 0; }
    statistics[statusCountColumn] += 1;

    const stepCountColumn = `messages_${workflowUser.current_step}_count`;
    if (!(stepCountColumn in statistics)) { statistics[stepCountColumn] = 0; }
    statistics[stepCountColumn] += 1;
    
    await WorkflowUsers().updateOne(workflowUser, { statistics });

    return workflowUser
  }
}
