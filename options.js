document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const debugModeCheckbox = document.getElementById('debugMode');
  const status = document.getElementById('status');

  // Load saved settings from local storage
  chrome.storage.local.get(['apiKey', 'debugMode'], (data) => {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
    
    if (data.debugMode !== undefined) {
      debugModeCheckbox.checked = data.debugMode;
    }
  });

  // Save button handler
  document.getElementById('saveButton').addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const debugMode = debugModeCheckbox.checked;
    
    chrome.storage.local.set({ apiKey, debugMode }, () => {
      status.textContent = 'Settings saved!';
      setTimeout(() => status.textContent = '', 2000);
    });
  });
});
