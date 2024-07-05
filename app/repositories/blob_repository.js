const fs = require('fs');
const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');
const envParams = require('#/configs/env_params');

const localPersist = async (binaryFile, filePath) => {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, binaryFile);
};

const s3Persist = async (binaryFile, filePath) => {
  const s3Client = new S3Client({ region: envParams().s3Region });

  const command = new s3Client.PutObjectCommand({
    Bucket: envParams().s3Bucket,
    Key: filePath,
    Body: binaryFile,
  });

  return s3Client.send(command);
};

const blobPersist = async (binaryFile, filePath) => {
  if (envParams().storageType === 'local') {
    return localPersist(binaryFile, filePath);
  }

  return s3Persist(binaryFile, path);
};

module.exports = { blobPersist };
