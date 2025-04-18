// Content script for "What Did I Just Read?" extension

// Import readability library (will be bundled with the content script)
import { Readability } from '@mozilla/readability';

// Create floating UI container
function createFloatingUI() {
  const container = document.createElement('div');
  container.id = 'what-did-i-just-read-container';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.2);
    z-index: 9999;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
  `;
  
  // Create TL;DR button
  const button = document.createElement('div');
  button.textContent = 'TL;DR';
  button.style.cssText = `
    font-weight: bold;
    color: #333;
  `;
  
  container.appendChild(button);
  document.body.appendChild(container);
  
  // Add click listener
  container.addEventListener('click', () => {
    toggleSummaryPanel();
  });
  
  return container;
}

// Summary panel that will be expanded when clicking the TL;DR button
function createSummaryPanel() {
  const panel = document.createElement('div');
  panel.id = 'what-summary-panel';
  panel.style.cssText = `
    display: none;
    position: fixed;
    bottom: 80px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.2);
    z-index: 9999;
    width: 350px;
    max-height: 500px;
    overflow-y: auto;
    padding: 20px;
  `;
  
  // Panel header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
  `;
  
  const title = document.createElement('h3');
  title.textContent = 'Summary';
  title.style.margin = '0';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
  `;
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.style.display = 'none';
  });
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);
  
  // Content container
  const content = document.createElement('div');
  content.id = 'what-summary-content';
  content.innerHTML = '<p>Generating summary...</p>';
  panel.appendChild(content);
  
  // Actions container
  const actions = document.createElement('div');
  actions.style.cssText = `
    display: flex;
    justify-content: space-between;
    margin-top: 15px;
  `;
  
  const quizBtn = document.createElement('button');
  quizBtn.textContent = 'Generate Quiz';
  quizBtn.style.cssText = `
    background: #0078d7;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
  `;
  quizBtn.addEventListener('click', () => {
    generateQuiz();
  });
  
  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.textContent = 'Save';
  bookmarkBtn.style.cssText = `
    background: #f3f3f3;
    color: #333;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
  `;
  bookmarkBtn.addEventListener('click', () => {
    saveSummary();
  });
  
  actions.appendChild(quizBtn);
  actions.appendChild(bookmarkBtn);
  panel.appendChild(actions);
  
  document.body.appendChild(panel);
  return panel;
}

// Toggle summary panel visibility
function toggleSummaryPanel() {
  const panel = document.getElementById('what-summary-panel') || createSummaryPanel();
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    loadOrGenerateSummary();
  } else {
    panel.style.display = 'none';
  }
}

// Request or load a cached summary
function loadOrGenerateSummary() {
  const contentDiv = document.getElementById('what-summary-content');
  contentDiv.innerHTML = '<p>Generating summary...</p>';
  
  // First check if we have a cached summary for this URL
  chrome.runtime.sendMessage(
    { type: 'GET_CACHED_SUMMARY', url: window.location.href },
    (response) => {
      if (response && response.summary) {
        displaySummary(response.summary);
      } else {
        // No cached summary, request a new one
        chrome.runtime.sendMessage(
          { type: 'SUMMARIZE_PAGE' },
          (response) => {
            if (response && response.error) {
              contentDiv.innerHTML = `<p>Error: ${response.error}</p>`;
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
  const contentDiv = document.getElementById('what-summary-content');
  
  if (summary.error) {
    contentDiv.innerHTML = `<p>Error: ${summary.error}</p>`;
    return;
  }
  
  // Format the summary with sections
  let html = `
    <div style="margin-bottom: 15px;">
      <h4 style="margin-top: 0;">Key Points</h4>
      <p>${summary.keyPoints}</p>
    </div>
    
    <div>
      <h4>Summary</h4>
      <p>${summary.fullSummary}</p>
    </div>
  `;
  
  contentDiv.innerHTML = html;
}

// Generate a quiz based on the summary
function generateQuiz() {
  const contentDiv = document.getElementById('what-summary-content');
  contentDiv.innerHTML += '<div id="what-quiz-section"><p>Generating quiz...</p></div>';
  
  chrome.runtime.sendMessage(
    { type: 'GENERATE_QUIZ', url: window.location.href },
    (response) => {
      if (response && response.error) {
        document.getElementById('what-quiz-section').innerHTML = 
          `<p>Error generating quiz: ${response.error}</p>`;
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
      const bookmarkBtn = document.querySelector('#what-summary-panel button:nth-child(2)');
      const originalText = bookmarkBtn.textContent;
      bookmarkBtn.textContent = 'Saved!';
      setTimeout(() => {
        bookmarkBtn.textContent = originalText;
      }, 2000);
    }
  );
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SUMMARIZATION_COMPLETE':
      displaySummary(message.summary);
      break;
      
    case 'SUMMARIZATION_ERROR':
      const contentDiv = document.getElementById('what-summary-content');
      contentDiv.innerHTML = `<p>Error: ${message.error}</p>`;
      break;
      
    case 'QUIZ_GENERATION_COMPLETE':
      displayQuiz(message.quiz);
      break;
      
    case 'QUIZ_GENERATION_ERROR':
      document.getElementById('what-quiz-section').innerHTML = 
        `<p>Error generating quiz: ${message.error}</p>`;
      break;
  }
});

// Display the generated quiz
function displayQuiz(quiz) {
  const quizSection = document.getElementById('what-quiz-section');
  
  let html = `
    <h4>Quick Quiz</h4>
    <form id="what-quiz-form">
  `;
  
  // Add each question
  quiz.questions.forEach((question, qIndex) => {
    html += `
      <div class="what-question" style="margin-bottom: 15px;">
        <p style="font-weight: bold;">${qIndex + 1}. ${question.question}</p>
    `;
    
    if (question.type === 'multiple-choice') {
      question.options.forEach((option, oIndex) => {
        html += `
          <div style="margin: 5px 0;">
            <input type="radio" name="q${qIndex}" id="q${qIndex}o${oIndex}" value="${oIndex}">
            <label for="q${qIndex}o${oIndex}">${option}</label>
          </div>
        `;
      });
    } else {
      html += `
        <input type="text" name="q${qIndex}" style="width: 100%; padding: 5px;">
      `;
    }
    
    html += `</div>`;
  });
  
  html += `
    <button type="submit" style="
      background: #0078d7;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
    ">Check Answers</button>
    </form>
    <div id="what-quiz-results" style="margin-top: 15px;"></div>
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
  
  // Compare answers
  quiz.questions.forEach((question, qIndex) => {
    const userAnswer = form.elements[`q${qIndex}`].value;
    
    if (question.type === 'multiple-choice') {
      if (parseInt(userAnswer) === question.correctOptionIndex) {
        correct++;
      }
    } else {
      // For short answer, check if the answer contains key phrases
      // This is a simple implementation and can be improved
      const userAnswerLower = userAnswer.toLowerCase();
      let isCorrect = question.keyPhrases.some(phrase => 
        userAnswerLower.includes(phrase.toLowerCase())
      );
      
      if (isCorrect) {
        correct++;
      }
    }
  });
  
  // Calculate score
  const score = Math.round((correct / total) * 100);
  
  // Display results
  resultsDiv.innerHTML = `
    <p>You scored ${correct}/${total} (${score}%)</p>
    <p>Save this score to track your retention over time:</p>
    <button id="what-save-score" style="
      background: #0078d7;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
    ">Save Score</button>
  `;
  
  // Add save score button handler
  document.getElementById('what-save-score').addEventListener('click', () => {
    saveQuizScore(score, correct, total);
  });
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
      saveBtn.textContent = 'Saved!';
      saveBtn.disabled = true;
    }
  );
}

// Initialize the extension UI
function init() {
  // Create the floating TL;DR button
  createFloatingUI();
}

// Start the extension
init();