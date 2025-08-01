const absoluteDir = __filename.split(`/`).slice(0, -1).join(`/`)

require('dotenv').config({ path: `${absoluteDir}/../.env.${process.env.NODE_ENV}` });

function shared() {
  return {
    database_url: process.env.DATABASE_URL,
    
    whatsapp_verify_token: process.env.WHATSAPP_VERIFY_TOKEN,
    whatsapp_app_secret: process.env.WHATSAPP_APP_SECRET,

    openai_api_key: process.env.OPENAI_API_KEY,
    openai_project_id: process.env.OPENAI_PROJECT_ID,
   
    whatsapp_permanent_token: process.env.WHATSAPP_PERMANENT_TOKEN,
    
    jwt_secret: process.env.JWT_SECRET,
    
    host_url: 'https://local.zapecho.com',

    default_email: process.env.DEFAULT_EMAIL,
  }
}

function development() {
  return {
    ...shared(),
    database_name: 'zapecho_development',
    storageType: 'local',

    host_url: 'https://local.zapecho.com',
  };
}

function production() {
  return {
    ...shared(),
    database_name: 'zapecho_production',

    storageType: 's3',
    s3Bucket: 'zapecho-production',
    s3Region: 'us-east-1',

    host_url: 'https://api.zapecho.com',
  };
}

const ENVORINMENTS = {
  development,
  production,
};

module.exports = function envParams(key = undefined) {
  const all_keys = (ENVORINMENTS[process.env.NODE_ENV] || development)();

  return key ? all_keys[key] : all_keys;
};
