// Main background script for the "What Did I Just Read?" extension
import './background/index.js';
import { initSummarizer } from './summarizer';

// Initialize the summarizer with the Groq API key
// In a production environment, this would be better secured
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Initialize the summarizer with the API key
if (!GROQ_API_KEY) {
  console.error('No Groq API key found. Summarization features will not work.');
  // You might want to show a notification to the user
} else {
  initSummarizer(GROQ_API_KEY);
  console.log('Summarizer initialized with Groq API');
}

console.log('Background service worker initialized');