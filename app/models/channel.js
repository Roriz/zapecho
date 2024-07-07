const { queryBuilder, BaseModel } = require('./base_model.js');

class Channel extends BaseModel {
  static table_name = 'channels';

  type;
  external_id;
}
const ChannelsQuery = () => queryBuilder(Channel);

module.exports = ChannelsQuery;
