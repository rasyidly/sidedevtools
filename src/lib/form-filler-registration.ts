/**
 * Programmatic registration of the Form Filler content script.
 *
 * The script is only registered while the feature is enabled, so disabled users
 * pay zero cost on every page they visit. Registration persists across browser
 * sessions, which is why the background worker reconciles it on startup.
 */

export const CONTENT_SCRIPT_ID = "sidedevtools-form-filler"
export const CONTENT_SCRIPT_FILE = "content.js"

export interface RegistrationResult {
	ok: boolean
	error?: string
}

function api() {
	if (typeof chrome === "undefined" || !chrome.scripting) return null
	return chrome.scripting
}

export async function isFormFillerRegistered(): Promise<boolean> {
	const scripting = api()
	if (!scripting?.getRegisteredContentScripts) return false
	try {
		const scripts = await scripting.getRegisteredContentScripts({
			ids: [CONTENT_SCRIPT_ID],
		})
		return scripts.some((script) => script.id === CONTENT_SCRIPT_ID)
	} catch {
		return false
	}
}

export async function registerFormFiller(): Promise<RegistrationResult> {
	const scripting = api()
	if (!scripting) return {ok: false, error: "Scripting API unavailable"}
	try {
		if (await isFormFillerRegistered()) return {ok: true}
		await scripting.registerContentScripts([
			{
				id: CONTENT_SCRIPT_ID,
				matches: ["<all_urls>"],
				js: [CONTENT_SCRIPT_FILE],
				runAt: "document_idle",
				allFrames: true,
				persistAcrossSessions: true,
			},
		])
		return {ok: true}
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		}
	}
}

export async function unregisterFormFiller(): Promise<RegistrationResult> {
	const scripting = api()
	if (!scripting) return {ok: false, error: "Scripting API unavailable"}
	try {
		await scripting.unregisterContentScripts({ids: [CONTENT_SCRIPT_ID]})
		return {ok: true}
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		}
	}
}

/** Keep the registration in sync with the saved configuration. */
export async function syncFormFiller(enabled: boolean): Promise<RegistrationResult> {
	return enabled ? registerFormFiller() : unregisterFormFiller()
}

/**
 * Inject the content script into a tab right now. Registration only affects
 * pages loaded after it happens, so this makes the feature usable in the tab the
 * user already has open without asking them to reload.
 */
export async function injectIntoActiveTab(tabId: number): Promise<boolean> {
	if (typeof chrome === "undefined" || !chrome.scripting?.executeScript) return false
	try {
		await chrome.scripting.executeScript({
			target: {tabId, allFrames: true},
			files: [CONTENT_SCRIPT_FILE],
		})
		return true
	} catch {
		return false
	}
}

/** Ping the content script on a tab, if it happens to be injected there. */export async function pingFormFiller(tabId: number): Promise<boolean> {
	if (typeof chrome === "undefined" || !chrome.tabs?.sendMessage) return false
	try {
		const response = await chrome.tabs.sendMessage(tabId, {
			type: "form-filler:ping",
		})
		return Boolean(response?.active)
	} catch {
		return false
	}
}

/** Ask the content script on a tab to fill the focused field or the form. */
export async function requestFill(
	tabId: number,
	scope: "field" | "form",
): Promise<{filled: number} | null> {
	if (typeof chrome === "undefined" || !chrome.tabs?.sendMessage) return null
	try {
		const response = await chrome.tabs.sendMessage(tabId, {
			type: "form-filler:fill",
			payload: {scope},
		})
		return response ?? null
	} catch {
		return null
	}
}
