<div align="center">

# 📚 What Did I Just Read?

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Made with Svelte](https://img.shields.io/badge/Made%20with-Svelte-FF3E00.svg)](https://svelte.dev/)
[![Powered by Groq](https://img.shields.io/badge/Powered%20by-Groq%20LLaMA%203-4B32C3.svg)](https://console.groq.com)

<img src="src/assets/icon128.png" alt="What Did I Just Read? Logo" width="128" height="128">

**Transform how you read online with AI-powered summaries and quizzes**

[Installation](#-installation) •
[Features](#-features) •
[How to Use](#-how-to-use) •
[Development](#-development) •
[Contributing](#-contributing)

</div>

---

## 🚀 Features

<table>
  <tr>
    <td width="50%">
      <h3>📝 AI-Powered Summaries</h3>
      <p>Get concise summaries of articles and web pages using Groq's state-of-the-art LLaMA 3 70B model.</p>
    </td>
    <td width="50%">
      <h3>🎯 Interactive Quizzes</h3>
      <p>Test your understanding and retention with automatically generated quizzes based on the content you've read.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📊 Performance Analytics</h3>
      <p>Gain insights into your reading habits and quiz performance with detailed statistics.</p>
    </td>
    <td width="50%">
      <h3>✨ Floating TL;DR Button</h3>
      <p>Quick access to summaries directly on web pages without needing to open the extension popup.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🌙 Dark Mode Support</h3>
      <p>Enjoy comfortable reading in all lighting conditions with automatic theme detection.</p>
    </td>
    <td colspan="2">
      <h3>🔒 Privacy-Focused</h3>
      <p>All your data is stored locally by default. Your reading history never leaves your device.</p>
    </td>
  </tr>
</table>

---

## 📋 How to Use

1. **Browse** to any article or content-heavy web page
2. **Get a summary** using one of two ways:
   - Click the "What Did I Just Read?" extension icon in your browser toolbar
   - Use the floating TL;DR button that appears on the page
3. **Review** the AI-generated summary with key points and detailed explanations
4. **Test yourself** by generating a quiz based on the content

<div align="center">
  <img src="https://via.placeholder.com/800x400?text=Extension+Screenshot" alt="Extension Screenshot" width="800">
  <p><em>The extension in action (placeholder image)</em></p>
</div>

---

## 💻 Installation

### From Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store (link coming soon)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation

1. Download the [latest release](https://github.com/yourusername/what-did-i-just-read/releases) (or follow the development setup below)
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extracted ZIP directory

---

## 🛠️ Development

### Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or higher)
- A Groq API key (sign up at [console.groq.com](https://console.groq.com))

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/rk-vashista/summarizer-Chrome-extentsion
   cd what-did-i-just-read
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file with your Groq API key
   ```bash
   echo "GROQ_API_KEY=your-groq-api-key-here" > .env
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

### Building for Development

```bash
npm run build:extension
```

This will build the extension files for testing in Chrome.

### Building for Production

```bash
npm run build:all
```

This creates a production-ready build in the `build` directory.

### Packaging for Distribution

```bash
npm run package
```

Creates a ZIP file suitable for Chrome Web Store submission.

---

## 📦 Tech Stack

<table>
  <tr>
    <th>Category</th>
    <th>Technologies</th>
  </tr>
  <tr>
    <td><strong>Frontend</strong></td>
    <td>Svelte 5, SvelteKit, Tailwind CSS</td>
  </tr>
  <tr>
    <td><strong>AI</strong></td>
    <td>Groq API, LLaMA 3 70B model</td>
  </tr>
  <tr>
    <td><strong>Storage</strong></td>
    <td>IndexedDB (via idb-keyval)</td>
  </tr>
  <tr>
    <td><strong>Text Processing</strong></td>
    <td>Mozilla's Readability.js</td>
  </tr>
  <tr>
    <td><strong>Browser Integration</strong></td>
    <td>Chrome Extension Manifest V3</td>
  </tr>
</table>

---

## 📁 Project Structure

```
src/
├── background/     # Background scripts for Groq API communication
├── content/        # Content scripts that run on web pages
├── popup/          # Extension popup UI components
├── summarizer/     # Text summarization logic using Groq
├── quiz/           # Quiz generation algorithms
├── storage/        # Local storage management (IndexedDB)
├── utils/          # Utility and helper functions
├── routes/         # SvelteKit routes
└── assets/         # Extension icons and images
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start SvelteKit development server |
| `npm run build` | Build SvelteKit app |
| `npm run build:extension` | Build Chrome extension files |
| `npm run build:all` | Build both SvelteKit app and extension |
| `npm run package` | Create ZIP file for distribution |
| `npm run format` | Format code with Prettier |
| `npm run lint` | Check code formatting |

---

## 👥 Contributing

Contributions are welcome and appreciated! Here's how to get started:

1. **Fork** the repository
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/rk-vashista/summarizer-Chrome-extentsion
   ```
3. **Create** a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Make** your changes
5. **Commit** with descriptive messages:
   ```bash
   git commit -m 'Add some amazing feature'
   ```
6. **Push** to your branch:
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open** a Pull Request

Please ensure your code follows the project's style guidelines and includes appropriate tests.

---

<div align="center">

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [Your Name/Team]

</div>
