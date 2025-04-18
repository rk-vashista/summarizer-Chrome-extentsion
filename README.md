# What Did I Just Read?

A Chrome extension that helps you understand and retain information from web pages using AI-powered summaries and quizzes, powered by Groq's LLM API.

## Features

- **AI-Powered Summaries**: Get concise summaries of articles and web pages using Groq's LLaMA 3 70B model
- **Interactive Quizzes**: Generate quizzes to test your understanding of what you've read
- **Bookmark & Track**: Save summaries and track your reading and quiz performance over time

## Setup and Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or higher)
- A Groq API key (sign up at [console.groq.com](https://console.groq.com))

### Development Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the project root with your Groq API key:
   ```
   GROQ_API_KEY=your-groq-api-key-here
   ```
4. Start the development server:
   ```
   npm run dev
   ```

### Building for Production

1. Build the extension:
   ```
   npm run build
   ```
2. The built extension will be in the `build` directory
3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `build` directory

## How to Use

1. Browse to any article or content-heavy web page
2. Click the "What Did I Just Read?" extension icon in your browser toolbar
3. View the AI-generated summary of the page
4. Generate a quiz to test your understanding
5. Save summaries for later reference

## Technologies Used

- Svelte 5 & SvelteKit
- Groq SDK (with LLaMA 3 70B model)
- Chrome Extension API
- Tailwind CSS

## Project Structure

```
src/
├── background/     # Background scripts for processing with Groq API
├── content/        # Content scripts for web page interaction
├── popup/          # Popup UI components
├── summarizer/     # Groq API interaction for text summarization
├── quiz/           # Quiz generation logic
├── storage/        # Local storage management
├── utils/          # Utility functions
└── assets/         # Extension icons, etc.
```

## License

MIT
