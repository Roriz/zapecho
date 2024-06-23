const absoluteDir = __filename.split(`/`).slice(0, -1).join(`/`)

require('dotenv').config({ path: `${absoluteDir}/../.env.${process.env.NODE_ENV}` });

function shared() {
  return {
    database_url: process.env.DATABASE_URL,
    
    whatsapp_verify_token: process.env.WHATSAPP_VERIFY_TOKEN,
    whatsapp_app_secret: process.env.WHATSAPP_APP_SECRET,

    openai_api_key: process.env.OPENAI_API_KEY,
    openai_project_id: process.env.OPENAI_PROJECT_ID,
  }
}

function development() {
  return {
    ...shared(),
    database_name: 'zapecho_development',
    storageType: 'local',
  };
}

function production() {
  return {
    ...shared(),
    database_name: 'zapecho_production',
    storageType: 's3',
    s3Bucket: 'zapecho-production',
    s3Region: 'us-east-1',
  };
}

const ENVORINMENTS = {
  development,
  production,
};

module.exports = function envParams() {
  return (ENVORINMENTS[process.env.NODE_ENV] || development)();
};
