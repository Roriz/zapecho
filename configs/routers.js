import HelloController from '../app/controllers/hello-controller.js'

export default function (app, _, done) {
  app.route({ method: 'GET', url: '/', ...HelloController.index })

  done()
}
