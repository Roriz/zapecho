const { queryBuilder, BaseModel } = require('./base_model.js');

class CalendarAuth extends BaseModel {
  static table_name = 'calendar_auths';
}

const CalendarAuthsQuery = () => queryBuilder(CalendarAuth);

module.exports = CalendarAuthsQuery;
