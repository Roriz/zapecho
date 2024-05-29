import { healthcheck } from '../app/controllers/healthcheck-controller.js';
import v1Routers from './routers/v1.js';

export default function routers(app, _, done) {
  app.route({ method: 'GET', url: '/', ...healthcheck });
  app.route({ method: 'GET', url: '/healthcheck', ...healthcheck });

  app.register(v1Routers, { prefix: '/v1' });

  done();
}
