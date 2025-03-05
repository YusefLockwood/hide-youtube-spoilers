function log(message, data = null) {
  chrome.storage.local.get('debugMode', (result) => {
    if (result.debugMode) {
      console.log(`[SpoilerHider Background] ${message}`, data || '');
    }
  });
}

function extractJsonFromMarkdown(responseText) {
  // Remove any surrounding markdown code block (e.g., ```json ... ```)
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (err) {
      console.error('Failed to parse extracted JSON:', err);
      throw new Error('Extracted text is not valid JSON');
    }
  }

  // Fallback: if no code block detected, assume whole response is JSON
  try {
    return JSON.parse(responseText);
  } catch (err) {
    console.error('Failed to parse response as JSON:', err);
    throw new Error('Response is not valid JSON');
  }
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'checkSpoilers') {
    log('Received checkSpoilers message');

    chrome.storage.local.get(['apiKey', 'debugMode'], async (data) => {
      const apiKey = data.apiKey;
      const debugMode = data.debugMode;

      if (!apiKey) {
        log('No API key found in storage');
        sendResponse({ spoilerIndices: [] });
        return;
      }

      const { title, comments } = message.payload;

      log('Sending request to OpenRouter AI');
      const prompt = `You are a spoiler detection assistant. Your job is to identify which comments under a YouTube video contain spoilers that imply a team may have won the game or competition.

      Please return a JSON object with:
      - "spoilerIndices": An array of integers representing the indices of comments that contain spoilers.
      - "reasoning": A short explanation (1-2 sentences) explaining how you determined which comments were spoilers.

      Example response:
      {
          "spoilerIndices": [1, 3, 7],
          "reasoning": "Comments 1, 3, and 7 revealed key plot twists mentioned directly in the comments."
      }

      Video Title: ${title}

      Comments:
      ${comments.map((text, idx) => `${idx}: ${text}`).join('\n')}
      `;


      try {
        if (debugMode) {
          console.log(`Bearer ${apiKey}`);
        }
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: [
              { role: 'system', content: 'You detect spoilers in YouTube comments.' },
              { role: 'user', content: prompt }
            ]
          })
        });

        const data = await response.json();
        log('Received AI response', data);

        const aiMessage = data?.choices?.[0]?.message?.content;

        let result = {};
        try {
          result = extractJsonFromMarkdown(aiMessage);
          log('Parsed AI response', result);
        } catch (parseError) {
          log('Failed to parse AI response', aiMessage);
          sendResponse({ spoilerIndices: [] });
          return;
        }

        if (Array.isArray(result.spoilerIndices)) {
          log('Returning spoiler indices', result.spoilerIndices);
          sendResponse({ spoilerIndices: result.spoilerIndices });
        } else {
          log('Invalid response format', result);
          sendResponse({ spoilerIndices: [] });
        }
      } catch (error) {
        log('API call failed', error);
        sendResponse({ spoilerIndices: [] });
      }
    });

    return true;
  }
});
