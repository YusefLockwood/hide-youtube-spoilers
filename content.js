(function() {
  let debugMode = false;
  
  // Initialize debugMode value from storage
  chrome.storage.local.get('debugMode', (result) => {
    debugMode = !!result.debugMode;
  });
  
  function log(message) {
    if (debugMode) {
      console.log(`[SpoilerHider Content] ${message}`);
    }
  }

  function injectStyles() {
    // Add styles for our UI elements
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .spoiler-overlay {
        position: relative;
        background-color: rgba(33, 33, 33, 0.9);
        border-radius: 4px;
        padding: 24px;
        text-align: center;
        color: white;
        font-family: 'YouTube Sans', 'Roboto', sans-serif;
        margin: 20px auto;
        max-width: 80%;
      }
      
      .spoiler-spinner {
        display: inline-block;
        width: 40px;
        height: 40px;
        margin-bottom: 16px;
      }
      
      .spoiler-spinner:after {
        content: " ";
        display: block;
        width: 32px;
        height: 32px;
        margin: 4px;
        border-radius: 50%;
        border: 4px solid #fff;
        border-color: #fff transparent #fff transparent;
        animation: spoiler-spinner 1.2s linear infinite;
      }
      
      @keyframes spoiler-spinner {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .spoiler-message {
        font-size: 18px;
        margin-bottom: 8px;
      }
      
      .spoiler-submessage {
        font-size: 14px;
        opacity: 0.8;
      }
    `;
    document.head.appendChild(styleEl);
  }

  function showLoadingIndicator() {
    log('Showing loading spinner');
    let existingSpinner = document.getElementById('spoiler-overlay');
    if (existingSpinner) return;

    const overlay = document.createElement('div');
    overlay.id = 'spoiler-overlay';
    overlay.className = 'spoiler-overlay';
    
    const spinner = document.createElement('div');
    spinner.className = 'spoiler-spinner';
    
    const message = document.createElement('div');
    message.className = 'spoiler-message';
    message.textContent = 'Checking for spoilers...';
    
    const submessage = document.createElement('div');
    submessage.className = 'spoiler-submessage';
    submessage.textContent = 'Analyzing comments to keep your viewing experience spoiler-free';
    
    overlay.appendChild(spinner);
    overlay.appendChild(message);
    overlay.appendChild(submessage);

    // Find the comments section and insert our overlay
    const commentsSection = document.querySelector("#sections.ytd-comments");
    if (commentsSection) {
      // Get comments contents
      const commentsContent = commentsSection.querySelector('#contents');
      
      // If the contents element exists, insert the overlay before it or in the comments section
      if (commentsContent) {
        commentsSection.insertBefore(overlay, commentsContent);
      } else {
        commentsSection.appendChild(overlay);
      }
    } else {
      // As a fallback, add to body
      document.body.appendChild(overlay);
    }
  }

  function hideLoadingIndicator() {
    log('Hiding loading spinner');
    const overlay = document.getElementById('spoiler-overlay');
    if (overlay) overlay.remove();
  }

  function showErrorMessage(msg) {
    log(`Error: ${msg}`);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'spoiler-overlay';
    errorDiv.style.backgroundColor = 'rgba(200, 0, 0, 0.9)';
    
    const errorIcon = document.createElement('div');
    errorIcon.textContent = '⚠️';
    errorIcon.style.fontSize = '32px';
    errorIcon.style.marginBottom = '16px';
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'spoiler-message';
    errorMessage.textContent = `Error: ${msg}`;
    
    errorDiv.appendChild(errorIcon);
    errorDiv.appendChild(errorMessage);
    
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  async function waitForComments() {
    log('Waiting for comments to load');
    return new Promise(resolve => {
      const observer = new MutationObserver((_, obs) => {
        const commentsSection = document.querySelector("#sections.ytd-comments");
        if (commentsSection) {
          const commentsLoaded = commentsSection.querySelectorAll('ytd-comment-thread-renderer');
          if (commentsLoaded.length > 0) {
            log('First comment detected - hiding entire comments section');
            
            // Hide the entire comments content section
            const commentsContent = commentsSection.querySelector('#contents');
            if (commentsContent) {
              commentsContent.style.visibility = 'hidden';
              log('Comments content section hidden');
            } else {
              log('Comments content section not found');
            }
            
            // Continue watching until we have enough comments to analyze
            if (commentsLoaded.length > 19) {
              log('Enough comments loaded for analysis');
              obs.disconnect();
              resolve(commentsSection);
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  function hideAllComments() {
    const commentThreads = document.querySelectorAll('ytd-comment-thread-renderer');
    return Array.from(commentThreads).map((elem, index) => {
      elem.style.display = 'none';  // Immediately hide all
      const commentTextElem = elem.querySelector('#content-text');
      const text = commentTextElem ? commentTextElem.innerText : '';
      if (debugMode) {
        console.log(`Hiding comment ${index}: ${text}`);
      }
      return { index, text };
    });
  }

  function showNonSpoilers(spoilerIndices) {
    const commentThreads = document.querySelectorAll('ytd-comment-thread-renderer');
    commentThreads.forEach((elem, index) => {
      if (!spoilerIndices.includes(index)) {
        if (debugMode) {
          console.log(`Revealing comment ${index}`);
        }
        elem.style.display = '';
      } else {
        if (debugMode) {
          console.log(`Keeping comment ${index} hidden (spoiler detected)`);
        }
      }
    });
    
    // Make the comments section visible again
    const commentsSection = document.querySelector("#sections.ytd-comments");
    if (commentsSection) {
      const commentsContent = commentsSection.querySelector('#contents');
      if (commentsContent) {
        commentsContent.style.visibility = 'visible';
        log('Comments content section revealed');
      }
    }
    
    // If spoilers were found, show a message
    if (spoilerIndices.length > 0) {
      const spoilerMsg = document.createElement('div');
      spoilerMsg.className = 'spoiler-overlay';
      spoilerMsg.style.backgroundColor = 'rgba(0, 100, 0, 0.8)';
      spoilerMsg.style.padding = '10px';
      spoilerMsg.style.marginBottom = '10px';
      
      const msgText = document.createElement('div');
      msgText.className = 'spoiler-message';
      msgText.textContent = `${spoilerIndices.length} spoiler${spoilerIndices.length > 1 ? 's' : ''} hidden`;
      
      spoilerMsg.appendChild(msgText);
      
      // Insert at the top of the comments section
      const commentsSection = document.querySelector("#sections.ytd-comments");
      if (commentsSection) {
        const firstChild = commentsSection.firstChild;
        commentsSection.insertBefore(spoilerMsg, firstChild);
        
        // Auto-remove after some time
        setTimeout(() => {
          if (spoilerMsg.parentNode) {
            spoilerMsg.remove();
          }
        }, 10000);
      }
    }
  }

  function getVideoTitle() {
    const titleElem = document.querySelector('div#title h1');
    const title = titleElem ? titleElem.innerText : document.title;
    log(`Detected video title: ${title}`);
    return title;
  }

  (async function() {
    try {
      // Inject styles for our UI elements
      injectStyles();
      
      await waitForComments();
      showLoadingIndicator();

      const commentsData = hideAllComments();
      const videoTitle = getVideoTitle();

      log('Sending comments data to background for processing');

      chrome.runtime.sendMessage({
        type: 'checkSpoilers',
        payload: {
          title: videoTitle,
          comments: commentsData.map(item => item.text)
        }
      }, function(response) {
        hideLoadingIndicator();

        if (chrome.runtime.lastError) {
          showErrorMessage('Failed to check spoilers (communication error).');
          log(`Error: ${chrome.runtime.lastError.message}`);
          showNonSpoilers([]);
          return;
        }

        if (response && response.spoilerIndices) {
          log('Received spoiler data from background:', response.spoilerIndices);
          showNonSpoilers(response.spoilerIndices);
        } else {
          showErrorMessage('Failed to retrieve spoiler data.');
          showNonSpoilers([]);
        }
      });
    } catch (err) {
      // In case of error, show comments section
      const commentsSection = document.querySelector("#sections.ytd-comments");
      if (commentsSection) {
        const commentsContent = commentsSection.querySelector('#contents');
        if (commentsContent) {
          commentsContent.style.visibility = 'visible';
        }
      }
      
      showErrorMessage(`Unexpected error: ${err.message}`);
      log(`Unexpected error: ${err.stack}`);
      showNonSpoilers([]);
    }
  })();
})();
