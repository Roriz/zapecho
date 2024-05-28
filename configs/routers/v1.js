import V1WhatsappController from '../../app/controllers/v1/whatsapp-controller.js'

export default function v1Routers (app, _, done) {
  app.route({ method: 'GET', url: '/whatsapp', ...V1WhatsappController.verify })
  app.route({ method: 'POST', url: '/whatsapp', ...V1WhatsappController.webhook })

  done()
}
