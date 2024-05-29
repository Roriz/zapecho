import User from '../../models/user.js';

export default function whatsappReceiveService() {
  User()
    .count('id')
    .then((rows) => {
      console.log(`Users count - ${rows[0].count}`);
    });
  // find_or_create_user(params)
  // save_message(params)
}
