function development() {
  return {
    DATABASE_NAME: 'zapecho_development',
  };
}

function production() {
  return {
    DATABASE_NAME: 'zapecho_production',
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
