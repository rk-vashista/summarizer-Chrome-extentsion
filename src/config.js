// Configuration values for the extension
export const config = {
  // This will be replaced during build time
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  API_URL: 'https://api.groq.com/openai/v1/',
  DEFAULT_MODEL: 'llama3-70b-8192'
};