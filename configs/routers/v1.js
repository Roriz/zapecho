import { whatsappVerify, whatsappWebhook } from '../../app/controllers/v1/whatsapp-controller.js';

export default function v1Routers(app, _, done) {
  app.route({ method: 'GET', url: '/whatsapp', ...whatsappVerify });
  app.route({ method: 'POST', url: '/whatsapp', ...whatsappWebhook });

  done();
}
