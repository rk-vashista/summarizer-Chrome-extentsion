// Utilities for the "What Did I Just Read?" extension

/**
 * Format a date for display
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted date string
 */
export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}

/**
 * Clean HTML content for safe display
 * @param {string} html - The HTML string to clean
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHtml(html) {
  // Simple implementation - in production, use DOMPurify
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Truncate text to a specified length
 * @param {string} text - The text to truncate
 * @param {number} length - Maximum length
 * @returns {string} - Truncated text
 */
export function truncateText(text, length = 100) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Extract domain from URL
 * @param {string} url - The URL to process
 * @returns {string} - Domain name
 */
export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return url;
  }
}

/**
 * Generate a unique ID
 * @returns {string} - Unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}