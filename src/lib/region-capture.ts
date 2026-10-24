/**
 * Region capture for SideDevTools.
 *
 * Click → the active tab freezes under a crosshair overlay → drag a rectangle →
 * only that region comes back as a PNG data URL. The screenshot is taken with
 * `chrome.tabs.captureVisibleTab` and the drag UI is injected temporarily into
 * the page inside a shadow root, so it needs no OS screen-sharing permission,
 * leaves no trace afterwards, and is dismissed with Escape.
 */

export interface CaptureRegion {
	/** PNG data URL of the selected region, cropped at device resolution. */
	dataUrl: string
	/** Cropped bitmap width in device pixels. */
	width: number
	/** Cropped bitmap height in device pixels. */
	height: number
	/** Device-pixel scale between the bitmap and the page's CSS pixels. */
	scale: number
}

const RESTRICTED_URLS = [
	"chrome:",
	"chrome-extension:",
	"edge:",
	"about:",
	"devtools:",
	"view-source:",
	"https://chromewebstore.google.com",
	"https://chrome.google.com/webstore",
	"https://microsoftedge.microsoft.com/addons",
]

/** Whether the current context can capture a region at all. */
export function regionCaptureAvailable(): boolean {
	return (
		typeof chrome !== "undefined" &&
		Boolean(chrome.tabs?.captureVisibleTab) &&
		Boolean(chrome.scripting?.executeScript)
	)
}

async function currentTab(): Promise<chrome.tabs.Tab | null> {
	const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true})
	return tab ?? null
}

function isRestricted(url: string | undefined): boolean {
	if (!url) return true
	return RESTRICTED_URLS.some((prefix) => url.startsWith(prefix))
}

/**
 * Run the interactive region selector over the active tab.
 * Resolves with the cropped region, or `null` when the user cancels.
 * Throws a friendly `Error` when capture is unavailable or blocked.
 */
export async function captureRegion(): Promise<CaptureRegion | null> {
	if (!regionCaptureAvailable()) {
		throw new Error("Region capture needs the SideDevTools extension context.")
	}

	const tab = await currentTab()
	if (!tab?.id) throw new Error("No active tab to capture.")
	if (isRestricted(tab.url)) {
		throw new Error(
			"This page can’t be captured — switch to a normal website tab and try again.",
		)
	}

	let screenshot: string
	try {
		screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
			format: "png",
		})
	} catch {
		throw new Error("Chrome blocked the screenshot for this tab.")
	}

	let injected: chrome.scripting.InjectionResult<CaptureRegion | null>[] | undefined
	try {
		injected = await chrome.scripting.executeScript({
			target: {tabId: tab.id},
			func: regionSelectorOverlay,
			args: [screenshot],
		})
	} catch {
		throw new Error("Couldn’t draw the capture overlay on this page.")
	}

	return injected?.[0]?.result ?? null
}

/**
 * Executed inside the captured page. Freezes the screenshot full-screen and lets
 * the user drag a rectangle out of it. This function is serialized by
 * `chrome.scripting.executeScript`, so it must stay completely self-contained.
 */
async function regionSelectorOverlay(
	imageDataUrl: string,
): Promise<CaptureRegion | null> {
	// Keep this string inline: the function is serialized for the page context,
	// so it cannot close over anything from this module.
	const hostId = "__sidedevtools_region_capture__"

	const existing = document.getElementById(hostId)
	if (existing) existing.remove()

	const image = new Image()
	image.src = imageDataUrl
	try {
		await image.decode()
	} catch {
		return null
	}

	const viewportWidth = Math.max(1, window.innerWidth)
	const viewportHeight = Math.max(1, window.innerHeight)
	const scale = image.naturalWidth / viewportWidth

	return await new Promise<CaptureRegion | null>((resolve) => {
		// Styles are applied through the CSSOM rather than a <style> element so
		// the overlay still renders on pages with a strict style-src CSP.
		const host = document.createElement("div")
		host.id = hostId
		host.style.cssText =
			"all:initial;position:fixed;inset:0;z-index:2147483647;margin:0;padding:0;"
		const root = host.attachShadow({mode: "open"})

		const stage = document.createElement("div")
		stage.style.cssText =
			"position:fixed;inset:0;cursor:crosshair;-webkit-user-select:none;user-select:none;" +
			"font-family:system-ui,-apple-system,sans-serif;"

		const shot = document.createElement("div")
		shot.style.cssText =
			'position:absolute;inset:0;background-image:url("' +
			imageDataUrl +
			'");background-size:100% 100%;background-repeat:no-repeat;'

		const crossV = document.createElement("div")
		crossV.style.cssText =
			"position:absolute;top:0;bottom:0;width:1px;background:rgba(52,211,153,0.65);pointer-events:none;display:none;"

		const crossH = document.createElement("div")
		crossH.style.cssText =
			"position:absolute;left:0;right:0;height:1px;background:rgba(52,211,153,0.65);pointer-events:none;display:none;"

		const rectEl = document.createElement("div")
		rectEl.style.cssText =
			"position:absolute;display:none;box-shadow:0 0 0 100vmax rgba(8,9,10,0.55);border:1.5px solid #34d399;"

		const sizeEl = document.createElement("div")
		sizeEl.style.cssText =
			"position:absolute;left:0;top:-26px;white-space:nowrap;padding:3px 7px;" +
			"border-radius:6px;background:#34d399;color:#06281d;" +
			"font:600 11px ui-monospace,SFMono-Regular,Menlo,monospace;"
		sizeEl.textContent = "0 × 0"
		rectEl.appendChild(sizeEl)

		const hint = document.createElement("div")
		hint.style.cssText =
			"position:absolute;top:14px;left:50%;transform:translateX(-50%);display:flex;" +
			"align-items:center;gap:8px;padding:8px 12px;border-radius:10px;" +
			"background:rgba(17,18,20,0.94);color:#e4e5e7;font-size:12px;line-height:1;" +
			"pointer-events:none;box-shadow:0 10px 34px rgba(0,0,0,0.5);" +
			"border:1px solid rgba(255,255,255,0.12);"
		const hintLead = document.createElement("b")
		hintLead.textContent = "Drag"
		hintLead.style.cssText = "color:#34d399;font-weight:600;"
		const hintText = document.createElement("span")
		hintText.textContent = "to capture a region"
		const hintKey = document.createElement("kbd")
		hintKey.textContent = "Esc"
		hintKey.style.cssText =
			"font:600 11px ui-monospace,monospace;padding:3px 6px;border-radius:5px;" +
			"background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.16);"
		const hintTail = document.createElement("span")
		hintTail.textContent = "to cancel"
		hint.append(hintLead, hintText, hintKey, hintTail)

		stage.append(shot, crossV, crossH, rectEl, hint)
		root.append(stage)

		let dragging = false
		let startX = 0
		let startY = 0

		const clampX = (value: number) => Math.max(0, Math.min(viewportWidth, value))
		const clampY = (value: number) =>
			Math.max(0, Math.min(viewportHeight, value))

		const cleanup = () => {
			window.removeEventListener("mousemove", onMove, true)
			window.removeEventListener("mouseup", onUp, true)
			window.removeEventListener("keydown", onKey, true)
			host.remove()
		}

		const settle = (value: CaptureRegion | null) => {
			cleanup()
			resolve(value)
		}

		function onMove(event: MouseEvent) {
			const x = clampX(event.clientX)
			const y = clampY(event.clientY)
			crossV.style.display = "block"
			crossH.style.display = "block"
			crossV.style.left = x + "px"
			crossH.style.top = y + "px"
			if (!dragging) return

			const left = Math.min(startX, x)
			const top = Math.min(startY, y)
			const width = Math.abs(x - startX)
			const height = Math.abs(y - startY)
			rectEl.style.display = "block"
			rectEl.style.left = left + "px"
			rectEl.style.top = top + "px"
			rectEl.style.width = width + "px"
			rectEl.style.height = height + "px"
			// Keep the size chip inside the viewport when the box hugs the top.
			if (top < 30) {
				sizeEl.style.top = "auto"
				sizeEl.style.bottom = "-26px"
			} else {
				sizeEl.style.top = "-26px"
				sizeEl.style.bottom = "auto"
			}
			sizeEl.textContent = Math.round(width) + " × " + Math.round(height)
		}

		function onDown(event: MouseEvent) {
			if (event.button !== 0) return
			event.preventDefault()
			dragging = true
			startX = clampX(event.clientX)
			startY = clampY(event.clientY)
			rectEl.style.display = "block"
			rectEl.style.left = startX + "px"
			rectEl.style.top = startY + "px"
			rectEl.style.width = "0px"
			rectEl.style.height = "0px"
		}

		function onUp(event: MouseEvent) {
			if (!dragging) return
			dragging = false

			const endX = clampX(event.clientX)
			const endY = clampY(event.clientY)
			const left = Math.min(startX, endX)
			const top = Math.min(startY, endY)
			const width = Math.abs(endX - startX)
			const height = Math.abs(endY - startY)

			// A plain click is not a selection — keep the overlay open.
			if (width < 4 || height < 4) {
				rectEl.style.display = "none"
				return
			}

			const sourceX = Math.round(left * scale)
			const sourceY = Math.round(top * scale)
			const sourceWidth = Math.max(1, Math.round(width * scale))
			const sourceHeight = Math.max(1, Math.round(height * scale))

			const canvas = document.createElement("canvas")
			canvas.width = sourceWidth
			canvas.height = sourceHeight
			const context = canvas.getContext("2d", {willReadFrequently: true})
			if (!context) {
				settle(null)
				return
			}
			context.drawImage(
				image,
				sourceX,
				sourceY,
				sourceWidth,
				sourceHeight,
				0,
				0,
				sourceWidth,
				sourceHeight,
			)
			settle({
				dataUrl: canvas.toDataURL("image/png"),
				width: sourceWidth,
				height: sourceHeight,
				scale,
			})
		}

		function onKey(event: KeyboardEvent) {
			if (event.key !== "Escape") return
			event.preventDefault()
			event.stopPropagation()
			settle(null)
		}

		stage.addEventListener("mousedown", onDown)
		window.addEventListener("mousemove", onMove, true)
		window.addEventListener("mouseup", onUp, true)
		window.addEventListener("keydown", onKey, true)
		document.documentElement.appendChild(host)
	})
}
