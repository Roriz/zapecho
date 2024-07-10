const fs = require('fs');
const { verifyToken } = require('~/services/auth/jwt.js');
const StorageBlobs = require('~/models/storage_blob.js');

const showStorageBlob = {
  async handler(req, reply) {
    if (!verifyToken(req.query.t)) {
      return reply.code(403).send({});
    }

    const storageBlob = await StorageBlobs().where('id', req.params.id).first()
    
    if (!storageBlob) {
      return reply.code(404).send({});
    }

    const bufferFile = fs.readFileSync(storageBlob.path)
    res.type(storageBlob.mimetype).send(bufferFile)
  },
};

module.exports = { showStorageBlob };
