import { build } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.warn('⚠️ Warning: GROQ_API_KEY environment variable not found. Create a .env file with your API key.');
}

// Get __dirname equivalent in ESM
const __dirname = dirname(fileURLToPath(import.meta.url));

// Define our extension entry points
const entryPoints = {
  background: resolve(__dirname, 'src/background-worker.js'),
  content: resolve(__dirname, 'src/content.js'),
  popup: resolve(__dirname, 'src/popup-init.js') // New entry point for popup
};

async function buildExtension() {
  try {
    console.log('🔨 Building Chrome extension scripts...');
    
    // Build background script - crucial for service worker
    await build({
      configFile: false,
      build: {
        emptyOutDir: false,
        outDir: 'build',
        lib: {
          formats: ['es'],
          entry: entryPoints.background,
          name: 'background',
          fileName: 'background'
        },
        rollupOptions: {
          output: {
            entryFileNames: 'background.js'
          }
        }
      },
      define: {
        // Explicitly inject the API key for config - this ensures it's available at runtime
        'process.env.GROQ_API_KEY': JSON.stringify(GROQ_API_KEY || '')
      }
    });
    
    // Build content script 
    await build({
      configFile: false,
      build: {
        emptyOutDir: false,
        outDir: 'build',
        lib: {
          formats: ['es'],
          entry: entryPoints.content, 
          name: 'content',
          fileName: 'content'
        },
        rollupOptions: {
          output: {
            entryFileNames: 'content.js'
          }
        }
      }
    });

    // Build popup script (to fix CSP issues)
    await build({
      configFile: false,
      build: {
        emptyOutDir: false,
        outDir: 'build',
        lib: {
          formats: ['es'],
          entry: entryPoints.popup, 
          name: 'popup',
          fileName: 'popup'
        },
        rollupOptions: {
          output: {
            entryFileNames: 'popup.js'
          }
        }
      }
    });

    // Copy manifest and assets
    console.log('📝 Copying extension files...');
    if (!fs.existsSync('build')) {
      fs.mkdirSync('build');
    }

    // Copy CSS
    try {
      fs.copyFileSync('src/app.css', 'build/app.css');
    } catch (err) {
      console.warn(`Warning: Could not copy app.css: ${err.message}`);
    }

    // Create updated popup.html without inline scripts (CSP-friendly)
    const popupHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What Did I Just Read?</title>
  <link rel="stylesheet" href="app.css">
  <!-- Add Content-Security-Policy meta tag -->
  <meta http-equiv="Content-Security-Policy" content="script-src 'self'">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="popup.js"></script>
</body>
</html>`;

    // Write the new popup.html to the build directory
    fs.writeFileSync('build/popup.html', popupHtmlContent);

    // Create a special env.js file to store the API key for all components to access
    const envJsContent = `// Environment variables for the extension
export const ENV = {
  GROQ_API_KEY: ${JSON.stringify(GROQ_API_KEY || '')}
};`;
    
    // Make sure the app directory exists
    if (!fs.existsSync('build/app')) {
      fs.mkdirSync('build/app', { recursive: true });
    }
    
    // Write the env.js file
    fs.writeFileSync('build/app/env.js', envJsContent);

    // Copy manifest
    fs.copyFileSync('src/manifest.json', 'build/manifest.json');
    
    // Create assets directory if it doesn't exist
    if (!fs.existsSync('build/assets')) {
      fs.mkdirSync('build/assets', { recursive: true });
    }
    
    // Copy icons
    ['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
      try {
        fs.copyFileSync(`src/assets/${icon}`, `build/assets/${icon}`);
      } catch (err) {
        console.warn(`Warning: Could not copy icon ${icon}: ${err.message}`);
      }
    });

    console.log('✅ Extension build complete! Files are in the build directory.');
    console.log(`✅ API key was ${GROQ_API_KEY ? 'successfully' : 'not'} included in the build.`);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildExtension();