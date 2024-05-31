import User from '../../models/user.js';

export default function whatsappReceiveService(params) {
  User().where('phone', params.phone);
  // find_or_create_user(params)
  // save_message(params)
}
