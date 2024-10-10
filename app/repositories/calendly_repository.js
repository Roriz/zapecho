const axios = require("axios");

module.exports = {
  getBusyTimes: async function getBusyTimes(user, startTime, endTime) {
    var options = {
      method: 'GET',
      url: 'https://api.calendly.com/user_busy_times',
      params: {
        user: user,
        start_time: startTime,
        end_time: endTime
      },
      headers: {'Content-Type': 'application/json', Authorization: ''}
    };

    return axios.request(options);
  }
}
