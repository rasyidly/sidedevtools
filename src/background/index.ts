// Background service worker for SideDevTools Chrome Extension

import {syncFormFiller} from "@/lib/form-filler-registration"
import {CONFIG_KEY} from "@/tools/form-filler/utils"

// Configure side panel to open on action click
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('Failed to set panel behavior:', error));
  }
  void reconcileFormFiller();
});

// Listen for keyboard command if any
chrome.commands.onCommand.addListener(async (command) => {
  if (command === '_execute_action') {
    // Chrome handles action execution automatically
  }
});

/**
 * The Form Filler content script is registered programmatically, so its state
 * has to be reconciled whenever the worker wakes up: a user may have toggled it
 * in another profile, or the extension may have been reloaded.
 */
async function reconcileFormFiller() {
  try {
    const stored = await chrome.storage.local.get(CONFIG_KEY)
    const config = stored?.[CONFIG_KEY] as {enabled?: boolean} | undefined
    await syncFormFiller(Boolean(config?.enabled))
  } catch (error) {
    console.error('Failed to reconcile Form Filler registration:', error)
  }
}

chrome.runtime.onStartup.addListener(() => {
  void reconcileFormFiller()
})

void reconcileFormFiller()
