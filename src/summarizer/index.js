// Summarizer module for "What Did I Just Read?" extension
import Groq from 'groq-sdk';
import { config } from '../config';

// Constants for prompts
const SUMMARY_PROMPT = `
You are an expert text summarizer. Summarize the following text in a clear and concise way.
Format your response as a JSON object with two fields:
1. "keyPoints": A bullet-point list of 3-5 key points from the text
2. "fullSummary": A comprehensive summary in 2-3 paragraphs

Text to summarize:
`;

const QUIZ_PROMPT = `
Based on the following summary, create a short quiz to test comprehension.
Generate 2-3 questions: at least one multiple-choice question and one short-answer question.
Format your response as a JSON object with a "questions" array, where each question has:
- "question": The question text
- "type": Either "multiple-choice" or "short-answer" 
- For multiple-choice questions, include:
  - "options": Array of possible answers
  - "correctOptionIndex": Index of the correct answer (0-based)
- For short-answer questions, include:
  - "keyPhrases": Array of key phrases/concepts that should appear in a correct answer

Summary:
`;

/**
 * Summarizer class that handles text summarization using the Groq API
 */
class Summarizer {
  constructor(apiKey) {
    // Using the provided API key or attempting to load from the environment
    const finalApiKey = apiKey || config.GROQ_API_KEY || '';
    
    if (!finalApiKey) {
      console.error('No Groq API key provided. Summarization will not work.');
    }
    
    this.groqClient = new Groq({ apiKey: finalApiKey });
    this.model = 'llama3-70b-8192'; // Using LLaMA 3 70B model for best quality
    
    console.log(`Summarizer initialized. API key ${finalApiKey ? 'is' : 'is not'} available.`);
  }
  
  /**
   * Generate a summary of the provided text
   * @param {string} text - The text to summarize
   * @returns {Promise<Object>} - A promise that resolves to the summary object
   */
  async summarize(text) {
    try {
      // Check if we have a valid API key
      if (!this.groqClient) {
        throw new Error('Groq client not properly initialized. Check API key.');
      }
      
      // Trimming content if it's too long to fit token limits
      const trimmedText = this.trimContent(text, 7000);
      
      const response = await this.groqClient.chat.completions.create({
        model: this.model,
        temperature: 0.3, // Lower temperature for more factual responses
        messages: [
          {
            role: 'system',
            content: 'You are an expert summarizer. Extract key information and provide concise summaries.'
          },
          {
            role: 'user',
            content: SUMMARY_PROMPT + trimmedText
          }
        ],
        response_format: { type: 'json_object' }
      });
      
      // Parse the JSON response
      const summaryText = response.choices[0].message.content;
      try {
        const summaryObject = JSON.parse(summaryText);
        return summaryObject;
      } catch (e) {
        console.error('Error parsing summary JSON:', e);
        // Fallback in case of parsing error
        return {
          keyPoints: "Error parsing response. Please try again.",
          fullSummary: summaryText
        };
      }
    } catch (error) {
      console.error('Summarization error:', error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }
  
  /**
   * Generate a quiz based on the provided summary
   * @param {Object} summary - The summary object
   * @returns {Promise<Object>} - A promise that resolves to the quiz object
   */
  async generateQuiz(summary) {
    try {
      const summaryText = JSON.stringify(summary);
      
      const response = await this.groqClient.chat.completions.create({
        model: this.model,
        temperature: 0.7, // Higher temperature for more creative questions
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator that creates excellent comprehension quizzes.'
          },
          {
            role: 'user',
            content: QUIZ_PROMPT + summaryText
          }
        ],
        response_format: { type: 'json_object' }
      });
      
      // Parse the JSON response
      const quizText = response.choices[0].message.content;
      try {
        const quizObject = JSON.parse(quizText);
        return quizObject;
      } catch (e) {
        console.error('Error parsing quiz JSON:', e);
        // Create a simple fallback quiz
        return {
          questions: [
            {
              question: "What was the main topic of the text?",
              type: "short-answer",
              keyPhrases: ["topic", "subject", "about"]
            }
          ]
        };
      }
    } catch (error) {
      console.error('Quiz generation error:', error);
      throw new Error(`Failed to generate quiz: ${error.message}`);
    }
  }
  
  /**
   * Trim content to a manageable size to avoid exceeding token limits
   * @param {string} text - The text to trim
   * @param {number} maxTokens - Approximate max tokens
   * @returns {string} - Trimmed text
   */
  trimContent(text, maxTokens) {
    // Very rough approximation: 4 chars ~= 1 token
    const maxChars = maxTokens * 4;
    
    if (text.length <= maxChars) {
      return text;
    }
    
    // Take the first 75% and last 25% of the allowed content
    // This preserves both the introduction and conclusion of the text
    const firstPart = Math.floor(maxChars * 0.75);
    const lastPart = Math.floor(maxChars * 0.25);
    
    return text.substring(0, firstPart) + 
           "\n\n[...content trimmed for length...]\n\n" +
           text.substring(text.length - lastPart);
  }
}

// Create and export a singleton instance
let instance = null;

/**
 * Initialize the summarizer with an API key
 * @param {string} apiKey - The Groq API key
 */
export function initSummarizer(apiKey) {
  instance = new Summarizer(apiKey);
}

/**
 * Get the singleton instance of the summarizer
 * @returns {Summarizer} - The summarizer instance
 */
export function getSummarizer() {
  if (!instance) {
    throw new Error('Summarizer not initialized. Call initSummarizer first.');
  }
  return instance;
}