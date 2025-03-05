# YouTube Spoiler Hider

A Chrome extension that uses AI to hide spoilers in YouTube comments, keeping your viewing experience enjoyment intact.

## Overview

YouTube Spoiler Hider is a browser extension that analyzes comments on YouTube videos to detect and hide potential spoilers. Using AI-powered content analysis, it identifies comments that might reveal important information about game outcomes, competition results, or plot twists.

## Features

- **AI-Powered Spoiler Detection**: Uses OpenRouter AI models to analyze comment content for spoilers
- **Automatic Comment Processing**: Analyzes comments in batches as they load
- **Clean User Interface**: Indicates when comments are being scanned and how many spoilers were hidden
- **Minimal Configuration**: Just add your API key and you're ready to go
- **Performance Optimized**: Only processes new comments as they appear
- **Error Handling**: Gracefully handles connection issues and ensures comments remain visible if something goes wrong

## Installation

### From Chrome Web Store

*(Coming Soon)*

### Manual Installation

1. Clone this repository or download it as a ZIP file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now be installed

## Setup

1. Click on the extension icon in your browser toolbar
2. Open the extension options page
3. Get an API key from [OpenRouter](https://openrouter.ai)
4. Enter your API key in the options page
5. Optionally enable debug logging for troubleshooting
6. Click "Save"

## Usage

1. Navigate to any YouTube video
2. The extension will automatically:
   - Hide all comments initially
   - Analyze them for spoilers
   - Show only non-spoiler comments
   - Continue to analyze new comments as they load when scrolling

No additional action is required on your part.

## How It Works

1. When you visit a YouTube video, the extension immediately hides the comments section
2. It extracts the text from each comment and sends it to the background script
3. The background script sends the comments to the OpenRouter API for analysis
4. The AI model identifies which comments contain spoilers
5. Comments without spoilers are shown, while spoilers remain hidden
6. As new comments load while scrolling, they are automatically processed

## Development

### Project Structure

```
├── manifest.json      # Extension configuration
├── background.js      # Background service worker
├── content.js         # Content script for YouTube pages
├── options.js         # Options page functionality
├── options.html       # Options page UI
├── styles.css         # Shared styles
└── icons/             # Extension icons
```

### Building from Source

1. Clone the repository:
   ```
   git clone https://github.com/your-username/hide-youtube-spoilers.git
   ```
2. Make your modifications
3. Test the extension locally using Chrome's "Load unpacked" feature

## Privacy

This extension:
- Only sends YouTube comment data to the AI service for spoiler analysis
- Does not collect or store any user data
- Does not track your browsing activity
- Only activates on YouTube watch pages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgements

- [OpenRouter](https://openrouter.ai) for providing access to AI models
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/reference/) documentation