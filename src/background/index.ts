// Background service worker for SideDevTools Chrome Extension

// Configure side panel to open on action click
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('Failed to set panel behavior:', error));
  }
});

// Listen for keyboard command if any
chrome.commands.onCommand.addListener(async (command) => {
  if (command === '_execute_action') {
    // Chrome handles action execution automatically
  }
});

export { };
