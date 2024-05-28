import HealthcheckController from '../app/controllers/healthcheck-controller.js'
import v1Routers from './routers/v1.js'

export default function (app, _, done) {
  app.route({ method: 'GET', url: '/', ...HealthcheckController.index })
  app.route({ method: 'GET', url: '/healthcheck', ...HealthcheckController.index })

  app.register(v1Routers, { prefix: '/v1' })

  done()
}
