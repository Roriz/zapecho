import getRawBody from 'raw-body';
import secureJson from 'secure-json-parse';

import { whatsappVerify, whatsappWebhook } from '../../app/controllers/v1/whatsapp-controller.js';

function preparsingRawBody(request, reply, payload, done) {
  const applyLimit = request.routeOptions.bodyLimit;

  getRawBody(request.raw, { length: null, limit: applyLimit, encoding: 'utf8' }, (err, string) => {
    if (err) { return; }

    request.rawBody = string;
  });

  done(null, payload);
}

function almostDefaultJsonParser(app) {
  return (req, body, done) => {
    try {
      const json = secureJson.parse(body.toString('utf8'), {
        protoAction: app.initialConfig.onProtoPoisoning,
        constructorAction: app.initialConfig.onConstructorPoisoning,
      });
      done(null, json);
    } catch (err) {
      err.statusCode = 400;
      done(err);
    }
  };
}

export default function v1Routers(app, _, done) {
  // eslint-disable-next-line no-param-reassign
  app.addHook('onRoute', (routeOptions) => { routeOptions.preParsing = [preparsingRawBody]; });
  app.addContentTypeParser(['application/json'], { parseAs: 'buffer' }, almostDefaultJsonParser(app));

  app.route({ method: 'GET', url: '/whatsapp', ...whatsappVerify });
  app.route({ method: 'POST', url: '/whatsapp', ...whatsappWebhook });

  done();
}
