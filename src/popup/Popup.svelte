<script>
  import { onMount } from 'svelte';
  import storageManager from '../storage';
  
  // Component state
  let currentTab = 'summary';
  let loading = true;
  let activeTabInfo = null;
  let summary = null;
  let stats = null;
  let bookmarks = [];
  let error = null;
  
  // On component mount
  onMount(async () => {
    try {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        error = 'No active tab found';
        loading = false;
        return;
      }
      
      activeTabInfo = tabs[0];
      
      // Try to get cached summary
      const cachedSummary = await chrome.runtime.sendMessage({
        type: 'GET_CACHED_SUMMARY', 
        url: activeTabInfo.url
      });
      
      if (cachedSummary && cachedSummary.summary) {
        summary = cachedSummary.summary;
      } else {
        // Request a new summary
        chrome.runtime.sendMessage({ type: 'SUMMARIZE_PAGE' });
      }
      
      // Load usage stats
      stats = await storageManager.getUsageStats();
      
      // Load bookmarks
      bookmarks = await storageManager.getAllBookmarks();
      
      loading = false;
    } catch (err) {
      console.error('Error initializing popup:', err);
      error = err.message;
      loading = false;
    }
  });
  
  // Handle tab switching
  function switchTab(tab) {
    currentTab = tab;
  }
  
  // Delete bookmark
  async function deleteBookmark(url) {
    await storageManager.deleteBookmark(url);
    bookmarks = await storageManager.getAllBookmarks();
  }
  
  // Generate quiz for current page
  function generateQuiz() {
    if (!summary) return;
    
    chrome.runtime.sendMessage({ 
      type: 'GENERATE_QUIZ',
      summary 
    });
    
    // Close popup and let content script handle quiz display
    window.close();
  }
  
  // Format date
  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
  }
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case 'SUMMARIZATION_COMPLETE':
        summary = message.summary;
        break;
        
      case 'SUMMARIZATION_ERROR':
        error = message.error;
        loading = false;
        break;
    }
  });
</script>

<main>
  <header>
    <h1>What Did I Just Read?</h1>
    <div class="tabs">
      <button class:active={currentTab === 'summary'} on:click={() => switchTab('summary')}>
        Summary
      </button>
      <button class:active={currentTab === 'bookmarks'} on:click={() => switchTab('bookmarks')}>
        Bookmarks
      </button>
      <button class:active={currentTab === 'stats'} on:click={() => switchTab('stats')}>
        Stats
      </button>
    </div>
  </header>
  
  <div class="content">
    {#if loading}
      <div class="loading">
        <p>Loading...</p>
      </div>
    {:else if error}
      <div class="error">
        <p>Error: {error}</p>
      </div>
    {:else}
      {#if currentTab === 'summary'}
        <div class="summary-tab">
          {#if summary}
            <div class="summary-content">
              <h2>Key Points</h2>
              <div class="key-points">
                {@html summary.keyPoints}
              </div>
              
              <h2>Summary</h2>
              <div class="full-summary">
                {@html summary.fullSummary}
              </div>
              
              <div class="actions">
                <button on:click={generateQuiz} class="primary-button">
                  Generate Quiz
                </button>
              </div>
            </div>
          {:else}
            <div class="no-summary">
              <p>Generating summary for current page...</p>
              <p class="hint">This may take a few moments.</p>
            </div>
          {/if}
        </div>
      {:else if currentTab === 'bookmarks'}
        <div class="bookmarks-tab">
          {#if bookmarks.length > 0}
            <ul class="bookmark-list">
              {#each bookmarks as bookmark}
                <li>
                  <div class="bookmark-item">
                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                      {bookmark.title || 'Untitled'}
                    </a>
                    <div class="bookmark-meta">
                      <span class="date">{formatDate(bookmark.timestamp)}</span>
                      <button on:click={() => deleteBookmark(bookmark.url)} class="delete-button">
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              {/each}
            </ul>
          {:else}
            <div class="no-bookmarks">
              <p>You haven't saved any bookmarks yet.</p>
              <p class="hint">Summarize pages and save them to see them here.</p>
            </div>
          {/if}
        </div>
      {:else if currentTab === 'stats'}
        <div class="stats-tab">
          {#if stats}
            <div class="stats-content">
              <div class="stat-item">
                <div class="stat-value">{stats.summarizedPages}</div>
                <div class="stat-label">Pages Summarized</div>
              </div>
              
              <div class="stat-item">
                <div class="stat-value">{stats.quizzesTaken}</div>
                <div class="stat-label">Quizzes Taken</div>
              </div>
              
              <div class="stat-item">
                <div class="stat-value">{stats.averageScore}%</div>
                <div class="stat-label">Average Quiz Score</div>
              </div>
              
              <div class="stat-item">
                <div class="stat-value">{stats.bookmarks}</div>
                <div class="stat-label">Bookmarks Saved</div>
              </div>
            </div>
          {:else}
            <div class="no-stats">
              <p>No statistics available.</p>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
  
  <footer>
    <p class="version">v1.0.0</p>
  </footer>
</main>

<style>
  main {
    width: 350px;
    min-height: 400px;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  header {
    padding: 15px;
    border-bottom: 1px solid #e0e0e0;
  }
  
  h1 {
    font-size: 18px;
    margin: 0 0 15px 0;
  }
  
  .tabs {
    display: flex;
    gap: 5px;
  }
  
  .tabs button {
    flex: 1;
    padding: 8px 12px;
    border: none;
    background: #f5f5f5;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .tabs button.active {
    background: #0078d7;
    color: white;
  }
  
  .content {
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    max-height: 350px;
  }
  
  .loading, .error, .no-summary, .no-bookmarks, .no-stats {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }
  
  .error {
    color: #d32f2f;
  }
  
  .hint {
    color: #757575;
    font-size: 12px;
  }
  
  h2 {
    font-size: 16px;
    margin: 0 0 10px 0;
  }
  
  .key-points, .full-summary {
    margin-bottom: 20px;
    font-size: 14px;
    line-height: 1.5;
  }
  
  .actions {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 20px;
  }
  
  .primary-button {
    background: #0078d7;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .bookmark-list {
    padding: 0;
    margin: 0;
    list-style: none;
  }
  
  .bookmark-item {
    padding: 10px 0;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .bookmark-item a {
    color: #0078d7;
    text-decoration: none;
    font-size: 14px;
    word-break: break-word;
  }
  
  .bookmark-meta {
    display: flex;
    justify-content: space-between;
    margin-top: 5px;
  }
  
  .date {
    font-size: 12px;
    color: #757575;
  }
  
  .delete-button {
    background: none;
    border: none;
    color: #d32f2f;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
  }
  
  .stats-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  
  .stat-item {
    padding: 15px;
    background: #f5f5f5;
    border-radius: 4px;
    text-align: center;
  }
  
  .stat-value {
    font-size: 24px;
    font-weight: bold;
    color: #0078d7;
  }
  
  .stat-label {
    font-size: 12px;
    color: #757575;
    margin-top: 5px;
  }
  
  footer {
    padding: 10px 15px;
    border-top: 1px solid #e0e0e0;
    text-align: right;
  }
  
  .version {
    margin: 0;
    color: #757575;
    font-size: 12px;
  }
</style>