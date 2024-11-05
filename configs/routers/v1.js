const { add } = require('lodash');
const getRawBody = require('raw-body');
const secureJson = require('secure-json-parse');

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

function addRoute(app, method, url, handler) {
  app.route({ method, url, ...handler });
  app.route({ method, url: `${url}/`, ...handler });
}

const { whatsappVerify, whatsappWebhook } = require('~/controllers/v1/whatsapp-controller.js');
const { showStorageBlob } = require('~/controllers/v1/storage-blob-controller.js');
const { authenticate, callback } = require('~/controllers/v1/google-controller.js');

module.exports = function v1Routers(app, _, done) {
  // eslint-disable-next-line no-param-reassign
  app.addHook('onRoute', (routeOptions) => { routeOptions.preParsing = [preparsingRawBody]; });
  app.addContentTypeParser(['application/json'], { parseAs: 'buffer' }, almostDefaultJsonParser(app));

  addRoute(app, 'GET', '/whatsapp', whatsappVerify);
  addRoute(app, 'POST', '/whatsapp', whatsappWebhook);
  addRoute(app, 'GET', '/storage_blobs/:id', showStorageBlob);
  addRoute(app, 'GET', '/google/authenticate', authenticate);
  addRoute(app, 'GET', '/google/callback', callback);

  done();
};
