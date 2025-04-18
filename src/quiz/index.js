// Quiz generator module for "What Did I Just Read?" extension
import { getSummarizer } from '../summarizer';
import storageManager from '../storage';

/**
 * Class to manage quiz generation and scoring
 */
class QuizGenerator {
  /**
   * Generate a quiz based on a summary
   * @param {Object} summary - The summary object to generate quiz from
   * @returns {Promise<Object>} - A quiz object with questions
   */
  async generateQuiz(summary) {
    try {
      const summarizer = getSummarizer();
      return await summarizer.generateQuiz(summary);
    } catch (error) {
      console.error('Quiz generation error:', error);
      throw new Error(`Failed to generate quiz: ${error.message}`);
    }
  }
  
  /**
   * Check answers against a quiz
   * @param {Object} quiz - The quiz object
   * @param {Object} answers - User's answers
   * @returns {Object} - Results with score and feedback
   */
  checkAnswers(quiz, answers) {
    if (!quiz || !quiz.questions || !Array.isArray(quiz.questions)) {
      throw new Error('Invalid quiz format');
    }
    
    let correct = 0;
    const total = quiz.questions.length;
    const feedback = [];
    
    quiz.questions.forEach((question, index) => {
      const userAnswer = answers[index];
      let isCorrect = false;
      let explanation = '';
      
      if (question.type === 'multiple-choice') {
        isCorrect = parseInt(userAnswer) === question.correctOptionIndex;
        explanation = isCorrect 
          ? 'Correct!' 
          : `Incorrect. The correct answer was: ${question.options[question.correctOptionIndex]}`;
      } else if (question.type === 'short-answer') {
        // Simple check if answer contains key phrases
        const userAnswerLower = userAnswer.toLowerCase();
        isCorrect = question.keyPhrases.some(phrase => 
          userAnswerLower.includes(phrase.toLowerCase())
        );
        explanation = isCorrect 
          ? 'Correct!' 
          : `Your answer should have included these key concepts: ${question.keyPhrases.join(', ')}`;
      }
      
      if (isCorrect) {
        correct++;
      }
      
      feedback.push({
        questionIndex: index,
        isCorrect,
        explanation
      });
    });
    
    const score = Math.round((correct / total) * 100);
    
    return {
      score,
      correct,
      total,
      feedback
    };
  }
  
  /**
   * Save a quiz score
   * @param {string} url - The URL of the page
   * @param {Object} scoreData - Score data
   */
  async saveScore(url, scoreData) {
    await storageManager.saveScore(url, scoreData);
  }
  
  /**
   * Get historical quiz scores for a URL
   * @param {string} url - The URL of the page
   * @returns {Promise<Array>} - Array of score objects
   */
  async getScoreHistory(url) {
    return await storageManager.getScores(url);
  }
  
  /**
   * Get performance analytics
   * @returns {Promise<Object>} - Performance statistics
   */
  async getPerformanceAnalytics() {
    const stats = await storageManager.getUsageStats();
    
    // We'll add more sophisticated analytics in the future
    return {
      quizzesTaken: stats.quizzesTaken,
      averageScore: stats.averageScore
    };
  }
}

// Create and export a singleton instance
const quizGenerator = new QuizGenerator();
export default quizGenerator;