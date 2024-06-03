const healthcheck = require('../app/controllers/healthcheck-controller.js');
const v1Routers = require('./routers/v1.js');

module.exports = function routers(app, _, done) {
  app.route({ method: 'GET', url: '/', ...healthcheck });
  app.route({ method: 'GET', url: '/healthcheck', ...healthcheck });

  app.register(v1Routers, { prefix: '/v1' });

  done();
};
