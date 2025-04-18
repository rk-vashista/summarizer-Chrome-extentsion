// Content script for "What Did I Just Read?" extension

// Import readability library (will be bundled with the content script)
import { Readability } from '@mozilla/readability';

// Create floating UI container
function createFloatingUI() {
  // Create container div
  const container = document.createElement('div');
  container.id = 'what-did-i-just-read-container';
  
  // Create an expanded container for showing summary preview
  const expandedContainer = document.createElement('div');
  expandedContainer.id = 'what-expanded-container';
  expandedContainer.style.cssText = `
    display: none;
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 250px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    z-index: 9998;
    padding: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 13px;
    color: #333;
    line-height: 1.4;
    max-height: 150px;
    overflow: hidden;
    transition: opacity 0.3s, transform 0.3s;
  `;
  document.body.appendChild(expandedContainer);
  
  // Set initial button style
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0078d7;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 9999;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    color: white;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  `;
  
  // Create TL;DR button
  const button = document.createElement('div');
  button.textContent = 'TL;DR';
  button.style.cssText = `
    font-size: 14px;
    user-select: none;
  `;
  
  // Add hover effect
  let hoverTimeout;
  container.addEventListener('mouseenter', () => {
    container.style.transform = 'scale(1.05)';
    container.style.boxShadow = '0 6px 16px rgba(0,0,0,0.25)';
    
    // Show preview after a short delay
    hoverTimeout = setTimeout(() => {
      showSummaryPreview();
    }, 300);
  });
  
  container.addEventListener('mouseleave', () => {
    container.style.transform = 'scale(1)';
    container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    
    // Clear the timeout if mouse leaves before preview shows
    clearTimeout(hoverTimeout);
    
    // Hide preview
    expandedContainer.style.display = 'none';
  });
  
  container.appendChild(button);
  document.body.appendChild(container);
  
  // Add click listener
  container.addEventListener('click', () => {
    // Hide preview if it's visible
    expandedContainer.style.display = 'none';
    
    // Toggle summary panel
    toggleSummaryPanel();
    
    // Animation on click
    container.style.transform = 'scale(0.95)';
    setTimeout(() => {
      container.style.transform = 'scale(1)';
    }, 200);
  });
  
  function showSummaryPreview() {
    // First check if we have a cached summary for this URL
    chrome.runtime.sendMessage(
      { type: 'GET_CACHED_SUMMARY', url: window.location.href },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting preview summary:', chrome.runtime.lastError);
          return;
        }
        
        if (response && response.summary) {
          // Show a preview of the summary
          const summary = response.summary;
          
          // Extract first sentence or two from key points (up to ~100 chars)
          let previewText = summary.keyPoints || '';
          previewText = previewText.replace(/<\/?[^>]+(>|$)/g, ""); // Remove HTML tags
          previewText = previewText.split(/[.!?]/).slice(0, 2).join('. ') + '...';
          
          if (previewText.length > 120) {
            previewText = previewText.substring(0, 120) + '...';
          }
          
          expandedContainer.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 6px;">Key Points Preview:</div>
            <div>${previewText}</div>
            <div style="margin-top: 8px; font-style: italic; color: #666; text-align: center;">
              Click for full summary
            </div>
          `;
          expandedContainer.style.display = 'block';
        }
      }
    );
  }
  
  return container;
}

// Summary panel that will be expanded when clicking the TL;DR button
function createSummaryPanel() {
  // Create panel container
  const panel = document.createElement('div');
  panel.id = 'what-summary-panel';
  
  // Check system preference for dark mode
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Inject CSS for panel and its components
  const style = document.createElement('style');
  style.textContent = `
    #what-summary-panel {
      --primary-color: #0078d7;
      --primary-hover: #106ebe;
      --text-color: #333;
      --background-color: #fff;
      --card-background: #f9f9f9;
      --border-color: #e0e0e0;
      --light-text: #757575;
      --error-color: #d32f2f;
      --success-color: #2e7d32;
      --heading-color: #444;
      
      display: none;
      position: fixed;
      bottom: 86px;
      right: 20px;
      background: var(--background-color);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      z-index: 9999;
      width: 380px;
      max-height: 600px;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      color: var(--text-color);
      transition: all 0.3s ease;
      animation: slideIn 0.3s forwards;
    }
    
    #what-summary-panel.dark-mode {
      --primary-color: #3498db;
      --primary-hover: #2980b9;
      --text-color: #e0e0e0;
      --background-color: #1e1e1e;
      --card-background: #2d2d2d;
      --border-color: #444;
      --light-text: #aaa;
      --error-color: #ff6b6b;
      --success-color: #4caf50;
      --heading-color: #f0f0f0;
    }
    
    @keyframes slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .what-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .what-panel-title {
      margin: 0;
      color: var(--heading-color);
      font-size: 18px;
      font-weight: 600;
    }
    
    .what-header-actions {
      display: flex;
      gap: 8px;
    }
    
    .what-icon-button {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: var(--light-text);
      transition: background 0.2s, color 0.2s;
    }
    
    .what-icon-button:hover {
      background: rgba(0,0,0,0.05);
      color: var(--text-color);
    }
    
    #what-summary-panel.dark-mode .what-icon-button:hover {
      background: rgba(255,255,255,0.1);
    }
    
    .what-panel-content {
      padding: 20px;
    }
    
    .what-section {
      margin-bottom: 20px;
    }
    
    .what-section h4 {
      margin-top: 0;
      margin-bottom: 12px;
      font-size: 16px;
      font-weight: 600;
      color: var(--heading-color);
    }
    
    .what-content-card {
      background: var(--card-background);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      font-size: 14px;
      line-height: 1.6;
    }
    
    .what-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      justify-content: flex-end;
    }
    
    .what-primary-button, .what-secondary-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 16px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .what-primary-button {
      background: var(--primary-color);
      color: white;
      border: none;
    }
    
    .what-primary-button:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }
    
    .what-secondary-button {
      background: transparent;
      color: var(--primary-color);
      border: 1px solid var(--primary-color);
    }
    
    .what-secondary-button:hover {
      background: rgba(0,120,215,0.05);
    }
    
    .what-question {
      background: var(--card-background);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .what-question-title {
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 12px;
    }
    
    .what-option {
      display: flex;
      align-items: center;
      padding: 8px 0;
      cursor: pointer;
    }
    
    .what-option input[type="radio"] {
      margin-right: 10px;
    }
    
    .what-option label {
      font-size: 14px;
      cursor: pointer;
    }
    
    .what-text-input {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 14px;
      background: var(--background-color);
      color: var(--text-color);
      margin-top: 8px;
      transition: border 0.2s;
    }
    
    .what-text-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(0,120,215,0.2);
    }
    
    .what-spinner {
      width: 30px;
      height: 30px;
      border: 3px solid rgba(0,120,215,0.2);
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: what-spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes what-spin {
      to { transform: rotate(360deg); }
    }
    
    .what-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 0;
      text-align: center;
    }
    
    .what-loading p {
      margin: 8px 0 0;
      color: var(--light-text);
    }
    
    .what-quiz-results {
      background: var(--card-background);
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
      text-align: center;
      animation: fadeIn 0.3s forwards;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .what-result-score {
      font-size: 24px;
      font-weight: bold;
      color: var(--primary-color);
      margin: 0 0 8px;
    }
    
    .what-result-text {
      margin: 0 0 16px;
    }
    
    .what-feedback {
      padding: 10px;
      border-radius: 6px;
      margin-top: 10px;
      font-size: 14px;
    }
    
    .what-feedback.correct {
      background: rgba(46, 125, 50, 0.1);
      color: #2e7d32;
    }
    
    .what-feedback.incorrect {
      background: rgba(211, 47, 47, 0.1);
      color: #d32f2f;
    }
  `;
  
  document.head.appendChild(style);
  
  // Set panel markup
  panel.innerHTML = `
    <div class="what-panel-header">
      <h3 class="what-panel-title">What Did I Just Read?</h3>
      <div class="what-header-actions">
        <button id="what-theme-toggle" class="what-icon-button" aria-label="Toggle dark mode">
          ${prefersDarkMode ? '☀️' : '🌙'}
        </button>
        <button id="what-close-panel" class="what-icon-button" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="what-panel-content" id="what-summary-content">
      <div class="what-loading">
        <div class="what-spinner"></div>
        <p>Analyzing content...</p>
      </div>
    </div>
  `;
  
  // Set dark mode if preferred by system
  if (prefersDarkMode) {
    panel.classList.add('dark-mode');
  }
  
  document.body.appendChild(panel);
  
  // Add event listeners
  document.getElementById('what-close-panel').addEventListener('click', () => {
    panel.style.animation = 'slideOut 0.3s forwards';
    setTimeout(() => {
      panel.style.display = 'none';
      panel.style.animation = '';
    }, 300);
  });
  
  document.getElementById('what-theme-toggle').addEventListener('click', () => {
    panel.classList.toggle('dark-mode');
    const button = document.getElementById('what-theme-toggle');
    button.innerHTML = panel.classList.contains('dark-mode') ? '☀️' : '🌙';
  });
  
  return panel;
}

// Toggle summary panel visibility
function toggleSummaryPanel() {
  const panel = document.getElementById('what-summary-panel') || createSummaryPanel();
  
  if (panel.style.display === 'none' || !panel.style.display) {
    panel.style.display = 'block';
    loadOrGenerateSummary();
  } else {
    panel.style.animation = 'slideOut 0.3s forwards';
    setTimeout(() => {
      panel.style.display = 'none';
      panel.style.animation = '';
    }, 300);
  }
}

// Request or load a cached summary
function loadOrGenerateSummary() {
  console.log('Loading or generating summary for URL:', window.location.href);
  const contentDiv = document.getElementById('what-summary-content');
  contentDiv.innerHTML = `
    <div class="what-loading">
      <div class="what-spinner"></div>
      <p>Analyzing content...</p>
    </div>
  `;
  
  // First check if we have a cached summary for this URL
  chrome.runtime.sendMessage(
    { type: 'GET_CACHED_SUMMARY', url: window.location.href },
    (response) => {
      console.log('Cached summary response:', response);
      
      // Handle potential errors in the messaging system
      if (chrome.runtime.lastError) {
        console.error('Error getting cached summary:', chrome.runtime.lastError);
        contentDiv.innerHTML = `
          <div class="what-error">
            <p>Error: ${chrome.runtime.lastError.message || 'Communication error with the extension'}</p>
            <button class="what-secondary-button" id="what-retry-button">Try Again</button>
          </div>
        `;
        document.getElementById('what-retry-button').addEventListener('click', loadOrGenerateSummary);
        return;
      }
      
      if (response && response.summary) {
        console.log('Found cached summary, displaying');
        displaySummary(response.summary);
      } else {
        console.log('No cached summary found, requesting new summary');
        // No cached summary, request a new one
        contentDiv.innerHTML = `
          <div class="what-loading">
            <div class="what-spinner"></div>
            <p>Generating summary for this page...</p>
            <p class="hint">This may take a few moments.</p>
          </div>
        `;
        
        chrome.runtime.sendMessage(
          { 
            type: 'SUMMARIZE_PAGE',
            tabId: null, // This will be filled in by the background script from sender.tab.id
            url: window.location.href
          },
          (response) => {
            // Handle potential errors in the messaging system
            if (chrome.runtime.lastError) {
              console.error('Error requesting summary:', chrome.runtime.lastError);
              contentDiv.innerHTML = `
                <div class="what-error">
                  <p>Error: ${chrome.runtime.lastError.message || 'Failed to generate summary'}</p>
                  <button class="what-secondary-button" id="what-retry-button">Try Again</button>
                </div>
              `;
              document.getElementById('what-retry-button').addEventListener('click', loadOrGenerateSummary);
              return;
            }
            
            if (response && response.error) {
              contentDiv.innerHTML = `
                <div class="what-error">
                  <p>Error: ${response.error}</p>
                  <button class="what-secondary-button" id="what-retry-button">Try Again</button>
                </div>
              `;
              document.getElementById('what-retry-button').addEventListener('click', loadOrGenerateSummary);
            }
            // The actual summary will come through the SUMMARIZATION_COMPLETE message
          }
        );
      }
    }
  );
}

// Display the summary in the panel
function displaySummary(summary) {
  console.log('Displaying summary:', summary);
  const contentDiv = document.getElementById('what-summary-content');
  
  if (!contentDiv) {
    console.error('Summary content div not found');
    return;
  }
  
  if (summary.error) {
    contentDiv.innerHTML = `
      <div class="what-error">
        <p>Error: ${summary.error}</p>
        <button class="what-secondary-button" id="what-retry-button">Try Again</button>
      </div>
    `;
    document.getElementById('what-retry-button').addEventListener('click', loadOrGenerateSummary);
    return;
  }
  
  // Format the summary with sections
  let html = `
    <div class="what-section">
      <h4>Key Points</h4>
      <div class="what-content-card">${summary.keyPoints || 'No key points available'}</div>
    </div>
    
    <div class="what-section">
      <h4>Summary</h4>
      <div class="what-content-card">${summary.fullSummary || 'No summary available'}</div>
    </div>
    
    <div class="what-actions">
      <button id="what-generate-quiz" class="what-primary-button">📝 Generate Quiz</button>
      <button id="what-save-summary" class="what-secondary-button">🔖 Save</button>
    </div>
    <div id="what-quiz-section"></div>
  `;
  
  contentDiv.innerHTML = html;
  
  // Add event listeners
  document.getElementById('what-generate-quiz').addEventListener('click', generateQuiz);
  document.getElementById('what-save-summary').addEventListener('click', saveSummary);
}

// Generate a quiz based on the summary
function generateQuiz() {
  const quizSection = document.getElementById('what-quiz-section');
  quizSection.innerHTML = `
    <div class="what-loading" style="padding: 20px 0;">
      <div class="what-spinner"></div>
      <p>Generating quiz questions...</p>
    </div>
  `;
  
  chrome.runtime.sendMessage(
    { type: 'GENERATE_QUIZ', url: window.location.href },
    (response) => {
      if (response && response.error) {
        quizSection.innerHTML = `
          <div class="what-content-card" style="color: var(--error-color);">
            <p>Error generating quiz: ${response.error}</p>
            <button class="what-secondary-button" onclick="window.location.reload()">Try Again</button>
          </div>
        `;
      }
      // The actual quiz will come through the QUIZ_GENERATION_COMPLETE message
    }
  );
}

// Save the summary for this page
function saveSummary() {
  chrome.runtime.sendMessage(
    { 
      type: 'SAVE_BOOKMARK', 
      data: {
        title: document.title,
        url: window.location.href,
        date: new Date().toISOString()
      } 
    },
    (response) => {
      // Show save confirmation
      const bookmarkBtn = document.getElementById('what-save-summary');
      bookmarkBtn.innerHTML = '✓ Saved';
      
      setTimeout(() => {
        bookmarkBtn.innerHTML = '🔖 Save';
      }, 2000);
    }
  );
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.type, message);

  switch (message.type) {
    case 'SUMMARIZATION_COMPLETE':
      console.log('Summary received from background:', message.summary);
      displaySummary(message.summary);
      break;
      
    case 'SUMMARIZATION_ERROR':
      console.error('Summarization error:', message.error);
      const contentDiv = document.getElementById('what-summary-content');
      if (contentDiv) {
        contentDiv.innerHTML = `
          <div class="what-error">
            <p>Error: ${message.error}</p>
            <button class="what-secondary-button" id="what-retry-button">Try Again</button>
          </div>
        `;
        document.getElementById('what-retry-button').addEventListener('click', loadOrGenerateSummary);
      }
      break;
      
    case 'QUIZ_GENERATION_COMPLETE':
      console.log('Quiz received:', message.quiz);
      displayQuiz(message.quiz);
      break;
      
    case 'QUIZ_GENERATION_ERROR':
      console.error('Quiz generation error:', message.error);
      const quizSection = document.getElementById('what-quiz-section');
      if (quizSection) {
        quizSection.innerHTML = `
          <div class="what-content-card" style="color: var(--error-color);">
            <p>Error generating quiz: ${message.error}</p>
            <button class="what-secondary-button" id="what-retry-quiz-button">Try Again</button>
          </div>
        `;
        document.getElementById('what-retry-quiz-button').addEventListener('click', generateQuiz);
      }
      break;
  }
  
  // Return true to indicate that we might respond asynchronously
  return true;
});

// Display the generated quiz
function displayQuiz(quiz) {
  const quizSection = document.getElementById('what-quiz-section');
  
  let html = `
    <div class="what-section">
      <h4>Quick Quiz</h4>
      <form id="what-quiz-form">
  `;
  
  // Add each question
  quiz.questions.forEach((question, qIndex) => {
    html += `
      <div class="what-question">
        <p class="what-question-title">${qIndex + 1}. ${question.question}</p>
    `;
    
    if (question.type === 'multiple-choice') {
      question.options.forEach((option, oIndex) => {
        html += `
          <div class="what-option">
            <input type="radio" name="q${qIndex}" id="q${qIndex}o${oIndex}" value="${oIndex}" required>
            <label for="q${qIndex}o${oIndex}">${option}</label>
          </div>
        `;
      });
    } else {
      html += `
        <input type="text" name="q${qIndex}" class="what-text-input" placeholder="Your answer" required>
      `;
    }
    
    html += `</div>`;
  });
  
  html += `
      <div class="what-actions">
        <button type="submit" class="what-primary-button">Check Answers</button>
      </div>
    </form>
    <div id="what-quiz-results"></div>
  `;
  
  quizSection.innerHTML = html;
  
  // Add form submission handler
  document.getElementById('what-quiz-form').addEventListener('submit', (e) => {
    e.preventDefault();
    checkQuizAnswers(quiz);
  });
}

// Check quiz answers
function checkQuizAnswers(quiz) {
  const form = document.getElementById('what-quiz-form');
  const resultsDiv = document.getElementById('what-quiz-results');
  
  let correct = 0;
  let total = quiz.questions.length;
  let feedback = [];
  
  // Compare answers
  quiz.questions.forEach((question, qIndex) => {
    const userAnswer = form.elements[`q${qIndex}`].value;
    let isCorrect = false;
    let explanation = '';
    
    if (question.type === 'multiple-choice') {
      if (parseInt(userAnswer) === question.correctOptionIndex) {
        correct++;
        isCorrect = true;
        explanation = 'Correct!';
      } else {
        explanation = `The correct answer was: ${question.options[question.correctOptionIndex]}`;
      }
    } else {
      // For short answer, check if the answer contains key phrases
      const userAnswerLower = userAnswer.toLowerCase();
      isCorrect = question.keyPhrases.some(phrase => 
        userAnswerLower.includes(phrase.toLowerCase())
      );
      
      if (isCorrect) {
        correct++;
        explanation = 'Correct!';
      } else {
        explanation = `Your answer should have included these key concepts: ${question.keyPhrases.join(', ')}`;
      }
    }
    
    feedback.push({ isCorrect, explanation });
  });
  
  // Calculate score
  const score = Math.round((correct / total) * 100);
  
  // Add score feedback
  let scoreMessage = '';
  if (score >= 90) {
    scoreMessage = 'Excellent! You really understood this content.';
  } else if (score >= 70) {
    scoreMessage = 'Good job! You grasped most of the key concepts.';
  } else if (score >= 50) {
    scoreMessage = 'Not bad! You understood some important points.';
  } else {
    scoreMessage = 'You might want to review this content again.';
  }
  
  // Display results
  resultsDiv.innerHTML = `
    <div class="what-quiz-results">
      <p class="what-result-score">${score}%</p>
      <p class="what-result-text">You got ${correct} out of ${total} questions correct</p>
      <p>${scoreMessage}</p>
      <button id="what-save-score" class="what-primary-button">Save Score</button>
    </div>
  `;
  
  // Show feedback for each question
  quiz.questions.forEach((question, qIndex) => {
    const questionEl = form.querySelector(`.what-question:nth-child(${qIndex + 1})`);
    const feedbackEl = document.createElement('div');
    feedbackEl.className = `what-feedback ${feedback[qIndex].isCorrect ? 'correct' : 'incorrect'}`;
    feedbackEl.textContent = feedback[qIndex].explanation;
    questionEl.appendChild(feedbackEl);
    
    // Highlight correct/incorrect
    if (question.type === 'multiple-choice') {
      const options = questionEl.querySelectorAll('.what-option');
      options.forEach((option, oIndex) => {
        if (oIndex === question.correctOptionIndex) {
          option.style.color = 'var(--success-color)';
          option.style.fontWeight = '500';
        }
      });
    }
  });
  
  // Add save score button handler
  document.getElementById('what-save-score').addEventListener('click', () => {
    saveQuizScore(score, correct, total);
  });
  
  // Scroll to results
  resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

// Save quiz score
function saveQuizScore(score, correct, total) {
  chrome.runtime.sendMessage(
    {
      type: 'SAVE_QUIZ_SCORE',
      data: {
        url: window.location.href,
        title: document.title,
        score,
        correct,
        total,
        date: new Date().toISOString()
      }
    },
    (response) => {
      const saveBtn = document.getElementById('what-save-score');
      saveBtn.textContent = '✓ Score Saved';
      saveBtn.disabled = true;
    }
  );
}

// Initialize the extension UI
function init() {
  console.log('Initializing "What Did I Just Read?" content script on:', window.location.href);
  
  // Create the floating TL;DR button
  createFloatingUI();
  
  // Create keyframes for slideOut animation
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes slideOut {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(20px); opacity: 0; }
    }
  `;
  document.head.appendChild(styleSheet);
  
  // Let the background script know that the content script is loaded
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_LOADED', url: window.location.href });
}

// Start the extension
init();