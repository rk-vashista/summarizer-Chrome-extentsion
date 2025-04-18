// Background service worker entry point for Chrome extension
// This file will be bundled separately to ensure it's compatible with Chrome's service worker requirements

// Import our background code
import './background/index.js';
import { initSummarizer } from './summarizer';
import { config } from './config';

// Initialize the summarizer with the Groq API key
const GROQ_API_KEY = config.GROQ_API_KEY;

// Initialize the summarizer with the API key
if (!GROQ_API_KEY) {
  console.error('No Groq API key found. Summarization features will not work.');
} else {
  initSummarizer(GROQ_API_KEY);
  console.log('Summarizer initialized with Groq API');
}

console.log('Background service worker initialized');