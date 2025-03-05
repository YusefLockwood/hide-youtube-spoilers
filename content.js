(function() {
  let debugMode = false;
  let processedCommentIds = new Set(); // Track processed comments by their IDs
  let isInitialBatch = true; // Flag to track if this is the first batch
  let isProcessing = false; // Flag to prevent concurrent processing
  
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

  // Function to observe new comments being added
  function observeCommentAddition() {
    log('Setting up comment addition observer');
    const commentsSection = document.querySelector("#sections.ytd-comments");
    if (!commentsSection) return;
    
    const commentObserver = new MutationObserver((mutations) => {
      if (isProcessing) return; // Don't start another processing cycle if one is already going
      
      const commentThreads = document.querySelectorAll('ytd-comment-thread-renderer');
      const unprocessedComments = Array.from(commentThreads).filter(comment => {
        // Check if this comment has an ID
        const commentId = comment.getAttribute('data-comment-id') || 
                         comment.getAttribute('id') || 
                         comment.dataset.commentId;
                         
        // If it doesn't have an ID, assign one
        if (!commentId) {
          const randomId = 'comment-' + Math.random().toString(36).substr(2, 9);
          comment.setAttribute('data-comment-id', randomId);
          return true; // Unprocessed
        }
        
        // Check if we've already processed this comment
        return !processedCommentIds.has(commentId);
      });
      
      // If we have enough new comments, process them
      if (unprocessedComments.length >= 20) {
        log(`Found ${unprocessedComments.length} new comments to analyze`);
        processNewComments(unprocessedComments);
      }
    });
    
    commentObserver.observe(commentsSection, { 
      childList: true, 
      subtree: true
    });
    
    log('Comment addition observer set up');
    return commentObserver;
  }

  async function waitForComments() {
    log('Waiting for comments to load');
    return new Promise(resolve => {
      const observer = new MutationObserver((_, obs) => {
        const commentsSection = document.querySelector("#sections.ytd-comments");
        if (commentsSection) {
          const commentsLoaded = commentsSection.querySelectorAll('ytd-comment-thread-renderer');
          if (commentsLoaded.length > 0) {
            log('First comment detected');
            
            if (isInitialBatch) {
              // For the first batch, hide the entire comments section
              log('Initial batch - hiding entire comments section');
              const commentsContent = commentsSection.querySelector('#contents');
              if (commentsContent) {
                commentsContent.style.visibility = 'hidden';
                log('Comments content section hidden');
              } else {
                log('Comments content section not found');
              }
            }
            
            // Continue watching until we have enough comments to analyze
            if (commentsLoaded.length >= 20) {
              log('Enough comments loaded for analysis');
              obs.disconnect();
              resolve(commentsLoaded);
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  function hideComments(comments) {
    return Array.from(comments).map((elem, index) => {
      // Mark as processed
      const commentId = elem.getAttribute('data-comment-id') || 
                       elem.getAttribute('id') || 
                       elem.dataset.commentId || 
                       ('comment-' + Math.random().toString(36).substr(2, 9));
      
      // Ensure comment has an ID for tracking
      if (!elem.hasAttribute('data-comment-id')) {
        elem.setAttribute('data-comment-id', commentId);
      }
      
      processedCommentIds.add(commentId);
      
      // Hide the comment
      elem.style.display = 'none';
      
      // Extract comment text
      const commentTextElem = elem.querySelector('#content-text');
      const text = commentTextElem ? commentTextElem.innerText : '';
      log(`Hiding comment ${commentId}: ${text}`);

      return { commentId, text, element: elem };
    });
  }

  function showNonSpoilers(commentsData, spoilerIndices) {
    commentsData.forEach((commentData, index) => {
      if (!spoilerIndices.includes(index)) {
        log(`Revealing comment ${commentData.commentId}`);
        commentData.element.style.display = '';
      } else {
        log(`Keeping comment ${commentData.commentId} hidden (spoiler detected)`);
      }
    });
    
    // If this is the initial batch, make the comments section visible again
    if (isInitialBatch) {
      const commentsSection = document.querySelector("#sections.ytd-comments");
      if (commentsSection) {
        const commentsContent = commentsSection.querySelector('#contents');
        if (commentsContent) {
          commentsContent.style.visibility = 'visible';
          log('Comments content section revealed');
        }
      }
      isInitialBatch = false;
    }
  }

  function getVideoTitle() {
    const titleElem = document.querySelector('div#title h1');
    const title = titleElem ? titleElem.innerText : document.title;
    log(`Detected video title: ${title}`);
    return title;
  }
  
  async function processNewComments(comments) {
    try {
      isProcessing = true;
      log(`Processing ${comments.length} new comments`);
      
      // Only show loading indicator for the initial batch
      if (isInitialBatch) {
        showLoadingIndicator();
      }

      const commentsData = hideComments(comments);
      const videoTitle = getVideoTitle();

      log('Sending comments data to background for processing');
      chrome.runtime.sendMessage({
        type: 'checkSpoilers',
        payload: {
          title: videoTitle,
          comments: commentsData.map(item => item.text)
        }
      }, function(response) {
        if (isInitialBatch) {
          hideLoadingIndicator();
        }

        if (chrome.runtime.lastError) {
          showErrorMessage('Failed to check spoilers (communication error).');
          log(`Error: ${chrome.runtime.lastError.message}`);
          showNonSpoilers(commentsData, []);
          isProcessing = false;
          return;
        }

        if (response && response.spoilerIndices) {
          log('Received spoiler data from background:', response.spoilerIndices);
          showNonSpoilers(commentsData, response.spoilerIndices);
        } else {
          showErrorMessage('Failed to retrieve spoiler data.');
          showNonSpoilers(commentsData, []);
        }
        isProcessing = false;
      });
    } catch (err) {
      // In case of error, show comments
      if (isInitialBatch) {
        const commentsSection = document.querySelector("#sections.ytd-comments");
        if (commentsSection) {
          const commentsContent = commentsSection.querySelector('#contents');
          if (commentsContent) {
            commentsContent.style.visibility = 'visible';
          }
        }
      }
      
      showErrorMessage(`Unexpected error: ${err.message}`);
      log(`Unexpected error: ${err.stack}`);
      showNonSpoilers(commentsData || [], []);
      isProcessing = false;
    }
  }

  (async function() {
    try {
      // Inject styles for our UI elements
      injectStyles();
      
      // Wait for initial comments to load
      const initialComments = await waitForComments();
      
      // Process the initial batch of comments
      await processNewComments(initialComments);
      
      // Set up an observer to process new comments as they load
      const commentObserver = observeCommentAddition();
      
      // Clean up when navigating away
      window.addEventListener('beforeunload', () => {
        if (commentObserver) {
          commentObserver.disconnect();
        }
      });
      
    } catch (err) {
      // In case of error, ensure comments are visible
      const commentsSection = document.querySelector("#sections.ytd-comments");
      if (commentsSection) {
        const commentsContent = commentsSection.querySelector('#contents');
        if (commentsContent) {
          commentsContent.style.visibility = 'visible';
        }
      }
      
      showErrorMessage(`Unexpected error: ${err.message}`);
      log(`Unexpected error: ${err.stack}`);
    }
  })();
})();
