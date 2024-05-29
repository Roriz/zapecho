export function development() {
  return {
    DATABASE_NAME: 'zapecho_development',
  };
}

export function production() {
  return {
    DATABASE_NAME: 'zapecho_production',
  };
}

export default function envParams() {
  const params = {
    development,
    production,
  };

  return (params[process.env.NODE_ENV] || development)();
}
