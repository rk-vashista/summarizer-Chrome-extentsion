// Popup initialization script - no inline scripts needed
// This script will be loaded by popup.html to initialize the UI

document.addEventListener('DOMContentLoaded', () => {
  const appElement = document.getElementById('app');
  
  if (appElement) {
    // Display a simple UI since we can't directly load the Svelte components
    appElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
        <h1 style="font-size: 18px; margin-bottom: 15px;">What Did I Just Read?</h1>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #f5f7fa; border-radius: 8px;">
          <p style="margin-bottom: 10px;">Click the button below to summarize the current page.</p>
          <button id="summarize-btn" style="background: #0078d7; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            Summarize This Page
          </button>
        </div>
        
        <div id="results" style="display: none; text-align: left; padding: 15px; background: #f5f7fa; border-radius: 8px; margin-top: 15px;">
          <h2 style="font-size: 16px; margin-bottom: 10px;">Summary</h2>
          <div id="summary-content"></div>
          
          <div style="margin-top: 15px;">
            <button id="quiz-btn" style="background: #0078d7; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
              Generate Quiz
            </button>
          </div>
        </div>
        
        <div id="loading" style="display: none; margin-top: 15px;">
          <p>Processing... Please wait.</p>
        </div>
        
        <div id="error" style="display: none; color: #d32f2f; margin-top: 15px;"></div>
      </div>
    `;
    
    // Keep track of the current page content
    let currentContent = null;
    
    // Listen for background script messages
    chrome.runtime.onMessage.addListener((message) => {
      const loadingEl = document.getElementById('loading');
      const errorEl = document.getElementById('error');
      const resultsEl = document.getElementById('results');
      
      switch(message.type) {
        case 'SUMMARIZATION_COMPLETE':
          loadingEl.style.display = 'none';
          
          // Display the summary
          const summaryEl = document.getElementById('summary-content');
          summaryEl.innerHTML = `
            <h3 style="font-size: 14px; margin-bottom: 8px;">Key Points</h3>
            <div style="margin-bottom: 12px;">${message.summary.keyPoints}</div>
            
            <h3 style="font-size: 14px; margin-bottom: 8px;">Full Summary</h3>
            <div>${message.summary.fullSummary}</div>
          `;
          
          resultsEl.style.display = 'block';
          break;
          
        case 'SUMMARIZATION_ERROR':
          loadingEl.style.display = 'none';
          errorEl.textContent = message.error || 'Failed to generate summary.';
          errorEl.style.display = 'block';
          break;
      }
    });
    
    // Add event listeners
    document.getElementById('summarize-btn').addEventListener('click', async () => {
      const loadingEl = document.getElementById('loading');
      const errorEl = document.getElementById('error');
      const resultsEl = document.getElementById('results');
      
      // Show loading state
      loadingEl.style.display = 'block';
      errorEl.style.display = 'none';
      resultsEl.style.display = 'none';
      
      try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
          throw new Error('Could not get active tab');
        }
        
        // Request summarization from background script
        chrome.runtime.sendMessage({ 
          type: 'SUMMARIZE_PAGE',
          tabId: tab.id
        });
        
        // Note: We don't handle the response here because the background script
        // will send a separate message when summarization is complete or fails
      } catch (error) {
        loadingEl.style.display = 'none';
        errorEl.textContent = error.message || 'Failed to start summarization';
        errorEl.style.display = 'block';
      }
    });
    
    // Add quiz button functionality
    document.getElementById('quiz-btn').addEventListener('click', () => {
      const loadingEl = document.getElementById('loading');
      const errorEl = document.getElementById('error');
      
      // Show loading state
      loadingEl.style.display = 'block';
      errorEl.style.display = 'none';
      
      // Request quiz generation from background script for the current URL
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) {
          loadingEl.style.display = 'none';
          errorEl.textContent = 'Could not get active tab';
          errorEl.style.display = 'block';
          return;
        }
        
        chrome.runtime.sendMessage({ 
          type: 'GENERATE_QUIZ',
          url: tabs[0].url
        });
        
        // Background will send a QUIZ_GENERATION_COMPLETE message when done
      });
    });
    
    // Also listen for quiz generation responses
    chrome.runtime.onMessage.addListener((message) => {
      const loadingEl = document.getElementById('loading');
      const errorEl = document.getElementById('error');
      
      if (message.type === 'QUIZ_GENERATION_COMPLETE') {
        loadingEl.style.display = 'none';
        // Display quiz (simplified for now)
        alert('Quiz generated! Questions: ' + message.quiz.questions.length);
      } else if (message.type === 'QUIZ_GENERATION_ERROR') {
        loadingEl.style.display = 'none';
        errorEl.textContent = message.error || 'Failed to generate quiz';
        errorEl.style.display = 'block';
      }
    });
    
    console.log('Popup UI initialized');
  }
});