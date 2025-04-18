<script>
  import { onMount, tick } from 'svelte';
  import { fade, slide, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import storageManager from '../storage';
  
  // Component state
  let currentTab = 'summary';
  let loading = true;
  let activeTabInfo = null;
  let summary = null;
  let stats = null;
  let bookmarks = [];
  let error = null;
  let darkMode = false;
  let showToast = false;
  let toastMessage = '';
  
  // On component mount
  onMount(async () => {
    // Check system preference for dark mode
    darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
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
  async function switchTab(tab) {
    currentTab = tab;
    await tick();
    // Focus first interactive element in the new tab for accessibility
    document.querySelector(`.${currentTab}-tab button`)?.focus();
  }
  
  // Delete bookmark
  async function deleteBookmark(url) {
    await storageManager.deleteBookmark(url);
    bookmarks = await storageManager.getAllBookmarks();
    showToastMessage('Bookmark deleted');
  }
  
  // Show toast message
  function showToastMessage(message) {
    toastMessage = message;
    showToast = true;
    setTimeout(() => {
      showToast = false;
    }, 3000);
  }
  
  // Save current page as bookmark
  async function saveBookmark() {
    if (!activeTabInfo) return;
    
    await storageManager.saveBookmark({
      url: activeTabInfo.url,
      title: activeTabInfo.title,
      summary: summary,
      timestamp: Date.now()
    });
    
    bookmarks = await storageManager.getAllBookmarks();
    showToastMessage('Page saved to bookmarks');
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
  
  // Toggle dark mode
  function toggleDarkMode() {
    darkMode = !darkMode;
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

<main class:dark-mode={darkMode}>
  <header>
    <div class="header-top">
      <h1>What Did I Just Read?</h1>
      <button class="icon-button" on:click={toggleDarkMode} aria-label="Toggle dark mode">
        {#if darkMode}
          <span class="icon">☀️</span>
        {:else}
          <span class="icon">🌙</span>
        {/if}
      </button>
    </div>
    <div class="tabs" role="tablist">
      <button 
        role="tab" 
        aria-selected={currentTab === 'summary'} 
        class:active={currentTab === 'summary'} 
        on:click={() => switchTab('summary')}
        aria-controls="summary-panel"
      >
        <span class="icon">📝</span> 
        <span>Summary</span>
      </button>
      <button 
        role="tab" 
        aria-selected={currentTab === 'bookmarks'} 
        class:active={currentTab === 'bookmarks'} 
        on:click={() => switchTab('bookmarks')}
        aria-controls="bookmarks-panel"
      >
        <span class="icon">🔖</span> 
        <span>Bookmarks</span>
      </button>
      <button 
        role="tab" 
        aria-selected={currentTab === 'stats'} 
        class:active={currentTab === 'stats'} 
        on:click={() => switchTab('stats')}
        aria-controls="stats-panel"
      >
        <span class="icon">📊</span> 
        <span>Stats</span>
      </button>
    </div>
  </header>
  
  <div class="content">
    {#if loading}
      <div class="loading" transition:fade>
        <div class="spinner" aria-label="Loading"></div>
        <p>Analyzing content...</p>
      </div>
    {:else if error}
      <div class="error" transition:fade>
        <span class="icon large">❌</span>
        <p>Error: {error}</p>
        <button class="secondary-button" on:click={() => window.location.reload()}>Try Again</button>
      </div>
    {:else}
      {#if currentTab === 'summary'}
        <div 
          id="summary-panel" 
          class="summary-tab tab-panel" 
          role="tabpanel" 
          aria-labelledby="tab-summary" 
          transition:fade={{ duration: 150 }}
        >
          {#if summary}
            <div class="summary-content">
              <div class="section key-points-section">
                <h2>Key Points</h2>
                <div class="key-points content-card" transition:slide={{ delay: 100, duration: 200 }}>
                  {@html summary.keyPoints}
                </div>
              </div>
              
              <div class="section full-summary-section">
                <h2>Summary</h2>
                <div class="full-summary content-card" transition:slide={{ delay: 150, duration: 200 }}>
                  {@html summary.fullSummary}
                </div>
              </div>
              
              <div class="actions">
                <button on:click={generateQuiz} class="primary-button">
                  <span class="icon">📝</span> Generate Quiz
                </button>
                <button on:click={saveBookmark} class="secondary-button">
                  <span class="icon">🔖</span> Save
                </button>
              </div>
            </div>
          {:else}
            <div class="no-summary" transition:fade>
              <div class="spinner" aria-label="Loading"></div>
              <p>Generating summary for current page...</p>
              <p class="hint">This may take a few moments.</p>
            </div>
          {/if}
        </div>
      {:else if currentTab === 'bookmarks'}
        <div 
          id="bookmarks-panel" 
          class="bookmarks-tab tab-panel" 
          role="tabpanel" 
          aria-labelledby="tab-bookmarks" 
          transition:fade={{ duration: 150 }}
        >
          {#if bookmarks.length > 0}
            <ul class="bookmark-list">
              {#each bookmarks as bookmark, i}
                <li transition:slide={{ delay: i * 50, duration: 200 }}>
                  <div class="bookmark-item content-card">
                    <div class="bookmark-header">
                      <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                        {bookmark.title || 'Untitled'}
                      </a>
                      <div class="bookmark-actions">
                        <button on:click={() => deleteBookmark(bookmark.url)} class="icon-button" aria-label="Delete bookmark">
                          <span class="icon">🗑️</span>
                        </button>
                      </div>
                    </div>
                    <div class="bookmark-meta">
                      <span class="date">{formatDate(bookmark.timestamp)}</span>
                    </div>
                  </div>
                </li>
              {/each}
            </ul>
          {:else}
            <div class="no-bookmarks" transition:fade>
              <span class="icon large">🔖</span>
              <p>You haven't saved any bookmarks yet.</p>
              <p class="hint">Summarize pages and save them to see them here.</p>
            </div>
          {/if}
        </div>
      {:else if currentTab === 'stats'}
        <div 
          id="stats-panel" 
          class="stats-tab tab-panel" 
          role="tabpanel" 
          aria-labelledby="tab-stats" 
          transition:fade={{ duration: 150 }}
        >
          {#if stats}
            <div class="stats-content">
              {#each [
                { value: stats.summarizedPages, label: 'Pages Summarized', icon: '📝' },
                { value: stats.quizzesTaken, label: 'Quizzes Taken', icon: '❓' },
                { value: stats.averageScore + '%', label: 'Average Quiz Score', icon: '🎯' },
                { value: stats.bookmarks, label: 'Bookmarks Saved', icon: '🔖' }
              ] as stat, i}
                <div class="stat-item content-card" transition:scale={{ delay: i * 50, duration: 200, easing: quintOut }}>
                  <div class="stat-icon">{stat.icon}</div>
                  <div class="stat-value">{stat.value}</div>
                  <div class="stat-label">{stat.label}</div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="no-stats" transition:fade>
              <span class="icon large">📊</span>
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
  
  {#if showToast}
    <div class="toast" transition:slide={{ duration: 300 }}>
      {toastMessage}
    </div>
  {/if}
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }
  
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  
  main {
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
    
    width: 380px;
    min-height: 500px;
    max-height: 600px;
    display: flex;
    flex-direction: column;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: var(--text-color);
    background-color: var(--background-color);
    transition: background-color 0.3s, color 0.3s;
  }
  
  main.dark-mode {
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
  
  .icon {
    font-size: 16px;
    display: inline-block;
    margin-right: 6px;
  }
  
  .icon.large {
    font-size: 36px;
    margin: 0 0 15px;
  }
  
  .content-card {
    background: var(--card-background);
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: box-shadow 0.2s, transform 0.2s;
  }
  
  .content-card:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    transform: translateY(-1px);
  }
  
  header {
    padding: 15px;
    border-bottom: 1px solid var(--border-color);
  }
  
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  
  h1 {
    font-size: 18px;
    margin: 0;
    color: var(--heading-color);
    font-weight: 600;
  }
  
  .tabs {
    display: flex;
    gap: 5px;
    border-radius: 8px;
    background: var(--card-background);
    padding: 4px;
  }
  
  .tabs button {
    flex: 1;
    padding: 10px 0;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 6px;
    font-size: 14px;
    color: var(--light-text);
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease-in-out;
  }
  
  .tabs button.active {
    background: var(--primary-color);
    color: white;
  }
  
  .tabs button:hover:not(.active) {
    background: rgba(0,0,0,0.05);
  }
  
  main.dark-mode .tabs button:hover:not(.active) {
    background: rgba(255,255,255,0.05);
  }
  
  .content {
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    max-height: 400px;
    scrollbar-width: thin;
    scrollbar-color: var(--border-color) transparent;
  }
  
  .content::-webkit-scrollbar {
    width: 6px;
  }
  
  .content::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .content::-webkit-scrollbar-thumb {
    background-color: var(--border-color);
    border-radius: 3px;
  }
  
  .loading, .error, .no-summary, .no-bookmarks, .no-stats {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    text-align: center;
  }
  
  .error {
    color: var(--error-color);
  }
  
  .hint {
    color: var(--light-text);
    font-size: 13px;
  }
  
  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid rgba(0,120,215,0.2);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  h2 {
    font-size: 16px;
    margin: 0 0 10px 0;
    font-weight: 600;
    color: var(--heading-color);
  }
  
  .section {
    margin-bottom: 20px;
  }
  
  .key-points, .full-summary {
    margin-bottom: 20px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-color);
  }
  
  .key-points p, .full-summary p {
    margin: 0 0 10px;
  }
  
  .actions {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 20px;
  }
  
  .primary-button, .secondary-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .primary-button {
    background: var(--primary-color);
    color: white;
    border: none;
  }
  
  .primary-button:hover {
    background: var(--primary-hover);
    transform: translateY(-1px);
  }
  
  .secondary-button {
    background: transparent;
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
  }
  
  .secondary-button:hover {
    background: rgba(0,120,215,0.05);
  }
  
  .icon-button {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }
  
  .icon-button:hover {
    background: rgba(0,0,0,0.05);
  }
  
  main.dark-mode .icon-button:hover {
    background: rgba(255,255,255,0.1);
  }
  
  .bookmark-list {
    padding: 0;
    margin: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .bookmark-item {
    padding: 12px;
  }
  
  .bookmark-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  .bookmark-item a {
    color: var(--primary-color);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    word-break: break-word;
    display: block;
    flex: 1;
    transition: color 0.2s;
  }
  
  .bookmark-item a:hover {
    color: var(--primary-hover);
    text-decoration: underline;
  }
  
  .bookmark-meta {
    margin-top: 8px;
  }
  
  .date {
    font-size: 12px;
    color: var(--light-text);
  }
  
  .bookmark-actions {
    margin-left: 10px;
  }
  
  .stats-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  
  .stat-item {
    padding: 15px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  
  .stat-icon {
    font-size: 20px;
    margin-bottom: 5px;
  }
  
  .stat-value {
    font-size: 24px;
    font-weight: bold;
    color: var(--primary-color);
  }
  
  .stat-label {
    font-size: 12px;
    color: var(--light-text);
    margin-top: 5px;
  }
  
  footer {
    padding: 10px 15px;
    border-top: 1px solid var(--border-color);
    text-align: right;
  }
  
  .version {
    margin: 0;
    color: var(--light-text);
    font-size: 12px;
  }
  
  .toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--card-background);
    color: var(--text-color);
    padding: 10px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    font-size: 14px;
    font-weight: 500;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px) translateX(-50%); }
    to { opacity: 1; transform: translateY(0) translateX(-50%); }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0) translateX(-50%); }
    to { opacity: 0; transform: translateY(10px) translateX(-50%); }
  }
</style>