function development() {
  return {
    DATABASE_NAME: 'zapecho_development',
    storageType: 'local',
  };
}

function production() {
  return {
    DATABASE_NAME: 'zapecho_production',
    storageType: 's3',
    s3Bucket: 'zapecho-production',
    s3Region: 'us-east-1',
  };
}

function envParams() {
  const params = {
    development,
    production,
  };

  return (params[process.env.NODE_ENV] || development)();
}

module.exports = envParams;
