// Background service worker for the "What Did I Just Read?" extension
import { getSummarizer } from '../summarizer';
import storageManager from '../storage';

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SUMMARIZE_PAGE': 
      handleSummarizePage(message, sender);
      return true; // Keep the messaging channel open for async response
      
    case 'GET_CACHED_SUMMARY':
      handleGetCachedSummary(message, sender, sendResponse);
      return true; // Keep the messaging channel open for async response
      
    case 'GENERATE_QUIZ':
      handleGenerateQuiz(message, sender, sendResponse);
      return true; // Keep the messaging channel open for async response
      
    case 'SAVE_BOOKMARK':
      handleSaveBookmark(message, sender, sendResponse);
      return false; // No async response needed
      
    case 'SAVE_QUIZ_SCORE':
      handleSaveQuizScore(message, sender, sendResponse);
      return false; // No async response needed
      
    case 'PROCESS_SUMMARIZATION':
      handleProcessSummarization(message.content, sendResponse);
      return true; // Keep the messaging channel open for async response
      
    case 'PROCESS_QUIZ_GENERATION':
      handleProcessQuizGeneration(message.summary, sendResponse);
      return true; // Keep the messaging channel open for async response
  }
});

// Handle summarize page request
async function handleSummarizePage(message, sender) {
  try {
    console.log('Starting page summarization process');
    
    // Get the tab ID either from the message or from the sender
    const tabId = message.tabId || (sender.tab && sender.tab.id);
    
    if (!tabId) {
      console.error('No tab ID found for summarization');
      chrome.runtime.sendMessage({
        type: 'SUMMARIZATION_ERROR',
        error: 'Could not identify which page to summarize'
      });
      return;
    }
    
    // Execute content script to extract page content
    chrome.scripting.executeScript({
      target: { tabId },
      function: extractPageContent
    }, async (results) => {
      if (chrome.runtime.lastError) {
        console.error('Script execution error:', chrome.runtime.lastError);
        chrome.runtime.sendMessage({
          type: 'SUMMARIZATION_ERROR',
          error: chrome.runtime.lastError.message || 'Could not extract page content'
        });
        return;
      }
      
      if (!results || results.length === 0) {
        console.error('No results returned from content script');
        chrome.runtime.sendMessage({
          type: 'SUMMARIZATION_ERROR',
          error: 'Could not extract page content'
        });
        return;
      }
      
      const content = results[0].result;
      console.log('Content extracted successfully, length:', content.content.length);
      
      // Check if we have a cached summary
      try {
        const cachedSummary = await storageManager.getSummary(content.url);
        if (cachedSummary) {
          console.log('Using cached summary');
          chrome.runtime.sendMessage({
            type: 'SUMMARIZATION_COMPLETE',
            summary: cachedSummary.summary
          });
          return;
        }
      } catch (error) {
        console.warn('Error checking for cached summary:', error);
      }
      
      // No cached summary, process the content
      try {
        console.log('Getting summarizer instance');
        const summarizer = getSummarizer();
        if (!summarizer) {
          throw new Error('Summarizer not initialized. Please check your API key.');
        }
        
        console.log('Calling summarize method');
        const summary = await summarizer.summarize(content.content);
        console.log('Summary generated successfully');
        
        // Store the summary
        try {
          await storageManager.saveSummary(content.url, {
            summary,
            title: content.title,
            url: content.url
          });
          console.log('Summary saved to storage');
        } catch (storageError) {
          console.warn('Error saving summary to storage:', storageError);
        }
        
        // Notify popup that summarization is complete
        chrome.runtime.sendMessage({
          type: 'SUMMARIZATION_COMPLETE',
          summary
        });
      } catch (error) {
        console.error('Summarization error:', error);
        chrome.runtime.sendMessage({
          type: 'SUMMARIZATION_ERROR',
          error: error.message || 'Failed to generate summary'
        });
      }
    });
  } catch (error) {
    console.error('Error handling summarize page request:', error);
    chrome.runtime.sendMessage({
      type: 'SUMMARIZATION_ERROR',
      error: error.message || 'Failed to start summarization process'
    });
  }
}

// Handle getting cached summary
async function handleGetCachedSummary(message, sender, sendResponse) {
  try {
    const { url } = message;
    const cachedSummary = await storageManager.getSummary(url);
    
    if (cachedSummary) {
      sendResponse({ summary: cachedSummary.summary });
    } else {
      sendResponse({ summary: null });
    }
  } catch (error) {
    console.error('Error getting cached summary:', error);
    sendResponse({ error: error.message });
  }
}

// Handle quiz generation
async function handleGenerateQuiz(message, sender, sendResponse) {
  try {
    const { url, summary } = message;
    
    // If we have a summary, use it directly
    if (summary) {
      try {
        const quiz = await getSummarizer().generateQuiz(summary);
        
        // Store the quiz
        await storageManager.saveQuiz(url || (sender.tab ? sender.tab.url : ''), quiz);
        
        // Notify any listeners that quiz generation is complete
        chrome.runtime.sendMessage({
          type: 'QUIZ_GENERATION_COMPLETE',
          quiz
        });
        
        sendResponse({ success: true });
      } catch (error) {
        console.error('Quiz generation error:', error);
        
        // Notify any listeners that quiz generation failed
        chrome.runtime.sendMessage({
          type: 'QUIZ_GENERATION_ERROR',
          error: error.message
        });
        
        sendResponse({ error: error.message });
      }
      return;
    }
    
    // If we don't have a summary but have a URL, try to get the cached summary
    if (url) {
      const cachedSummary = await storageManager.getSummary(url);
      
      if (cachedSummary) {
        try {
          const quiz = await getSummarizer().generateQuiz(cachedSummary.summary);
          
          // Store the quiz
          await storageManager.saveQuiz(url, quiz);
          
          // Notify any listeners that quiz generation is complete
          chrome.runtime.sendMessage({
            type: 'QUIZ_GENERATION_COMPLETE',
            quiz
          });
          
          sendResponse({ success: true });
        } catch (error) {
          console.error('Quiz generation error:', error);
          
          // Notify any listeners that quiz generation failed
          chrome.runtime.sendMessage({
            type: 'QUIZ_GENERATION_ERROR',
            error: error.message
          });
          
          sendResponse({ error: error.message });
        }
        return;
      }
    }
    
    // If we get here, we don't have a summary or a cached summary
    sendResponse({ error: 'No summary available to generate quiz' });
  } catch (error) {
    console.error('Error handling generate quiz request:', error);
    sendResponse({ error: error.message });
  }
}

// Handle saving bookmarks
async function handleSaveBookmark(message, sender, sendResponse) {
  try {
    const { data } = message;
    
    // If we don't have a URL in the data, try to get it from the sender
    if (!data.url && sender.tab) {
      data.url = sender.tab.url;
    }
    
    // If we don't have a title in the data, try to get it from the sender
    if (!data.title && sender.tab) {
      data.title = sender.tab.title;
    }
    
    await storageManager.saveBookmark(data);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving bookmark:', error);
    sendResponse({ error: error.message });
  }
}

// Handle saving quiz scores
async function handleSaveQuizScore(message, sender, sendResponse) {
  try {
    const { data } = message;
    
    // If we don't have a URL in the data, try to get it from the sender
    if (!data.url && sender.tab) {
      data.url = sender.tab.url;
    }
    
    await storageManager.saveScore(data.url, data);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving quiz score:', error);
    sendResponse({ error: error.message });
  }
}

// Process summarization with Groq API
async function handleProcessSummarization(content, sendResponse) {
  try {
    const summary = await getSummarizer().summarize(content.content);
    sendResponse(summary);
  } catch (error) {
    console.error('Summarization error:', error);
    sendResponse({ error: error.message });
  }
}

// Process quiz generation with Groq API
async function handleProcessQuizGeneration(summary, sendResponse) {
  try {
    const quiz = await getSummarizer().generateQuiz(summary);
    sendResponse(quiz);
  } catch (error) {
    console.error('Quiz generation error:', error);
    sendResponse({ error: error.message });
  }
}

// Extract content from page
function extractPageContent() {
  const getTextContent = (element) => {
    if (!element) return '';
    
    // Include only visible text content
    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
      return '';
    }
    
    // Exclude common non-article elements
    const nodeName = element.nodeName.toLowerCase();
    if (['script', 'style', 'noscript', 'iframe', 'nav', 'footer'].includes(nodeName)) {
      return '';
    }
    
    const className = element.className || '';
    const id = element.id || '';
    
    // Skip likely navigation, footer, sidebar, comment sections
    const lowerCaseClass = className.toString().toLowerCase();
    const lowerCaseId = id.toString().toLowerCase();
    
    if (
      lowerCaseClass.includes('nav') ||
      lowerCaseClass.includes('menu') ||
      lowerCaseClass.includes('footer') ||
      lowerCaseClass.includes('sidebar') ||
      lowerCaseClass.includes('comment') ||
      lowerCaseId.includes('nav') ||
      lowerCaseId.includes('menu') ||
      lowerCaseId.includes('footer') ||
      lowerCaseId.includes('sidebar') ||
      lowerCaseId.includes('comment')
    ) {
      return '';
    }
    
    let text = '';
    
    // For text nodes, get the text content
    if (element.nodeType === Node.TEXT_NODE) {
      text = element.textContent.trim();
    }
    
    // For element nodes, recurse into children
    if (element.childNodes && element.childNodes.length > 0) {
      for (let i = 0; i < element.childNodes.length; i++) {
        text += ' ' + getTextContent(element.childNodes[i]);
      }
    }
    
    return text.trim();
  };
  
  // First try to use Readability if it's available
  try {
    if (typeof window.Readability !== 'undefined') {
      const documentClone = document.cloneNode(true);
      const reader = new window.Readability(documentClone);
      const article = reader.parse();
      
      if (article) {
        return {
          title: article.title || document.title,
          content: article.textContent,
          excerpt: article.excerpt,
          url: window.location.href
        };
      }
    }
  } catch (error) {
    console.warn('Error using Readability:', error);
  }
  
  // Fallback to custom content extraction
  const content = getTextContent(document.body);
  
  return {
    title: document.title,
    content,
    url: window.location.href
  };
}

// Helper function to get the current active tab
async function getCurrentTab() {
  const queryOptions = { active: true, currentWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}