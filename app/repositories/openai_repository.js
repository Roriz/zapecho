const OpenAI = require('openai');

module.exports = function openaiRepository() {
  return new OpenAI();
}
