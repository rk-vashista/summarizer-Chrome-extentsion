// Storage module for "What Did I Just Read?" extension
import { get, set, del, keys } from 'idb-keyval';

/**
 * Class to manage data persistence for the extension
 */
class StorageManager {
  /**
   * Prefixes for different data types
   * @private
   */
  prefixes = {
    summary: 'summary:',
    quiz: 'quiz:',
    score: 'score:',
    bookmark: 'bookmark:'
  };
  
  /**
   * Save a summary to storage
   * @param {string} url - The URL of the page
   * @param {object} summary - The summary object
   * @returns {Promise<void>}
   */
  async saveSummary(url, summary) {
    const key = this.prefixes.summary + this.normalizeUrl(url);
    const data = {
      summary,
      timestamp: Date.now()
    };
    return set(key, data);
  }
  
  /**
   * Get a summary from storage
   * @param {string} url - The URL of the page
   * @returns {Promise<object|null>} - The summary object or null if not found
   */
  async getSummary(url) {
    const key = this.prefixes.summary + this.normalizeUrl(url);
    return get(key);
  }
  
  /**
   * Save a quiz to storage
   * @param {string} url - The URL of the page
   * @param {object} quiz - The quiz object
   * @returns {Promise<void>}
   */
  async saveQuiz(url, quiz) {
    const key = this.prefixes.quiz + this.normalizeUrl(url);
    const data = {
      quiz,
      timestamp: Date.now()
    };
    return set(key, data);
  }
  
  /**
   * Get a quiz from storage
   * @param {string} url - The URL of the page
   * @returns {Promise<object|null>} - The quiz object or null if not found
   */
  async getQuiz(url) {
    const key = this.prefixes.quiz + this.normalizeUrl(url);
    return get(key);
  }
  
  /**
   * Save a quiz score
   * @param {string} url - The URL of the page
   * @param {object} scoreData - Score data object with score, correct, total properties
   * @returns {Promise<void>}
   */
  async saveScore(url, scoreData) {
    // Get existing scores for this URL
    const key = this.prefixes.score + this.normalizeUrl(url);
    let scores = await get(key) || [];
    
    // Add new score with timestamp
    scores.push({
      ...scoreData,
      timestamp: Date.now()
    });
    
    // Keep only the most recent 10 scores
    if (scores.length > 10) {
      scores = scores.slice(-10);
    }
    
    return set(key, scores);
  }
  
  /**
   * Get scores for a URL
   * @param {string} url - The URL of the page
   * @returns {Promise<Array>} - Array of score objects
   */
  async getScores(url) {
    const key = this.prefixes.score + this.normalizeUrl(url);
    return get(key) || [];
  }
  
  /**
   * Save a bookmark
   * @param {object} bookmarkData - Bookmark data (title, url, summary)
   * @returns {Promise<void>}
   */
  async saveBookmark(bookmarkData) {
    const key = this.prefixes.bookmark + this.normalizeUrl(bookmarkData.url);
    const data = {
      ...bookmarkData,
      timestamp: Date.now()
    };
    return set(key, data);
  }
  
  /**
   * Get all bookmarks
   * @returns {Promise<Array>} - Array of bookmark objects
   */
  async getAllBookmarks() {
    // Get all keys with the bookmark prefix
    const allKeys = await keys();
    const bookmarkKeys = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith(this.prefixes.bookmark)
    );
    
    // Get all bookmark data
    const bookmarks = await Promise.all(
      bookmarkKeys.map(key => get(key))
    );
    
    // Sort by timestamp (most recent first)
    return bookmarks.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Delete a bookmark
   * @param {string} url - The URL of the bookmark to delete
   * @returns {Promise<void>}
   */
  async deleteBookmark(url) {
    const key = this.prefixes.bookmark + this.normalizeUrl(url);
    return del(key);
  }
  
  /**
   * Get usage statistics
   * @returns {Promise<object>} - Usage statistics
   */
  async getUsageStats() {
    const allKeys = await keys();
    
    // Count number of items by type
    const summarizedPages = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith(this.prefixes.summary)
    ).length;
    
    const quizzesTaken = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith(this.prefixes.score)
    ).length;
    
    const bookmarks = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith(this.prefixes.bookmark)
    ).length;
    
    // Calculate average quiz score
    let totalScore = 0;
    let scoreCount = 0;
    
    const scoreKeys = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith(this.prefixes.score)
    );
    
    for (const key of scoreKeys) {
      const scores = await get(key) || [];
      scores.forEach(score => {
        totalScore += score.score;
        scoreCount++;
      });
    }
    
    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
    
    return {
      summarizedPages,
      quizzesTaken,
      bookmarks,
      averageScore
    };
  }
  
  /**
   * Clear all data
   * @returns {Promise<void>}
   */
  async clearAllData() {
    const allKeys = await keys();
    return Promise.all(allKeys.map(key => del(key)));
  }
  
  /**
   * Normalize URL by removing query parameters and hash
   * @param {string} url - The URL to normalize
   * @returns {string} - Normalized URL
   * @private
   */
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.origin + urlObj.pathname;
    } catch (e) {
      return url;
    }
  }
}

// Create and export a singleton instance
const storageManager = new StorageManager();
export default storageManager;