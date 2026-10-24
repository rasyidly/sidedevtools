/**
 * Form Filler content script.
 *
 * Registered programmatically (only while the feature is enabled) so it costs
 * nothing on pages the user never fills. It listens for the configured
 * modifier + double-click gesture and fills the focused field, or the whole
 * enclosing form when Shift is held.
 */

import {createFaker, renderPattern} from "@/lib/faker"
import type {Faker} from "@/lib/faker"
import {
	CONFIG_KEY,
	DEFAULT_CONFIG,
	detectFieldKind,
	patternForKind,
} from "@/tools/form-filler/utils"
import type {
	FieldDescriptor,
	FieldKind,
	FormFillerConfig,
} from "@/tools/form-filler/utils"

const CONTENT_SCRIPT_ID = "sidedevtools-form-filler"

const IGNORED_TYPES = new Set([
	"hidden",
	"submit",
	"button",
	"reset",
	"file",
	"image",
	"checkbox",
	"radio",
	"range",
])

const HIGHLIGHT_COLOR = "#008060"

let config: FormFillerConfig = {...DEFAULT_CONFIG}
let faker: Faker | null = null
let fakerSeed = 0

function getFaker() {
	const seed = config.seed === 0 ? Math.floor(Math.random() * 1e9) : config.seed
	if (!faker || seed !== fakerSeed) {
		faker = createFaker(config.locale, seed)
		fakerSeed = seed
	}
	return faker
}

function isPaused() {
	const host = location.hostname
	return config.pausedHosts.some(
		(paused) => host === paused || host.endsWith(`.${paused}`),
	)
}

function modifierHeld(event: MouseEvent) {
	const keys: Record<string, boolean> = {
		meta: event.metaKey,
		ctrl: event.ctrlKey,
		alt: event.altKey,
	}
	return Boolean(keys[config.modifier])
}

/* ------------------------------------------------------------------ */
/* Describing and filling elements                                     */
/* ------------------------------------------------------------------ */

function labelText(element: Element) {
	const id = element.getAttribute("id")
	if (id) {
		const explicit = document.querySelector(`label[for="${CSS.escape(id)}"]`)
		if (explicit?.textContent) return explicit.textContent
	}
	const wrapping = element.closest("label")
	return wrapping?.textContent ?? ""
}

export function describeElement(element: Element): FieldDescriptor | null {
	if (element instanceof HTMLTextAreaElement) {
		return {
			tag: "textarea",
			type: "textarea",
			name: element.name,
			id: element.id,
			placeholder: element.placeholder || "",
			autocomplete: element.autocomplete || "",
			label: labelText(element),
			value: element.value,
		}
	}
	if (element instanceof HTMLInputElement) {
		return {
			tag: "input",
			type: element.type,
			name: element.name,
			id: element.id,
			placeholder: element.placeholder || "",
			autocomplete: element.autocomplete || "",
			label: labelText(element),
			value: element.value,
		}
	}
	if (element instanceof HTMLSelectElement) {
		return {
			tag: "select",
			type: "select",
			name: element.name,
			id: element.id,
			placeholder: "",
			autocomplete: element.autocomplete || "",
			label: labelText(element),
			value: element.value,
		}
	}
	return null
}

function isEligible(element: Element): boolean {
	const descriptor = describeElement(element)
	if (!descriptor) return false
	if (element instanceof HTMLSelectElement) return config.fillSelects
	if (element instanceof HTMLInputElement) {
		if (IGNORED_TYPES.has((element.type || "text").toLowerCase())) return false
		if (element.disabled || element.readOnly) return false
		if (element.type === "password" && !patternForKind("password", config)) return false
		return true
	}
	if (element instanceof HTMLTextAreaElement) {
		return !element.disabled && !element.readOnly
	}
	return false
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
	const prototype =
		element instanceof HTMLTextAreaElement
			? HTMLTextAreaElement.prototype
			: HTMLInputElement.prototype
	const descriptor = Object.getOwnPropertyDescriptor(prototype, "value")
	if (descriptor?.set) descriptor.set.call(element, value)
	else element.value = value
	element.dispatchEvent(new Event("input", {bubbles: true}))
	element.dispatchEvent(new Event("change", {bubbles: true}))
}

/** Shape a generated value so the field actually accepts it. */
function coerceValue(element: Element, raw: string): string {
	if (element instanceof HTMLInputElement) {
		const type = (element.type || "text").toLowerCase()
		if (type === "date") return raw.slice(0, 10)
		if (type === "datetime-local") return raw.slice(0, 16)
		if (type === "month") return raw.slice(0, 7)
		if (type === "week") {
			const date = new Date(raw)
			if (Number.isNaN(date.getTime())) return ""
			const firstDay = new Date(date.getFullYear(), 0, 1)
			const week = Math.ceil(
				((date.getTime() - firstDay.getTime()) / 86_400_000 +
					firstDay.getDay() +
					1) /
					7,
			)
			return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`
		}
		if (type === "time") {
			const date = new Date(raw)
			return Number.isNaN(date.getTime())
				? "09:30"
				: `${String(date.getHours()).padStart(2, "0")}:${String(
						date.getMinutes(),
					).padStart(2, "0")}`
		}
		if (type === "color") {
			const match = raw.match(/#([0-9a-f]{6})/i)
			return match ? `#${match[1]}` : "#008060"
		}
		if (type === "number" || type === "range") {
			const numeric = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""))
			return Number.isFinite(numeric) ? String(numeric) : "1"
		}
	}
	return raw
}

function flash(element: Element) {
	if (!config.showHighlight) return
	const node = element as HTMLElement
	const previous = node.style.boxShadow
	node.style.boxShadow = `0 0 0 2px ${HIGHLIGHT_COLOR}`
	setTimeout(() => {
		node.style.boxShadow = previous
	}, 900)
}

function fillOne(element: Element, kind: FieldKind) {
	const pattern = patternForKind(kind, config)
	if (!pattern) return false
	const raw = renderPattern(getFaker(), pattern)
	const value = coerceValue(element, raw)

	if (element instanceof HTMLSelectElement) {
		const options = [...element.options].filter((option) => !option.disabled)
		const pool = options.filter((option) => option.value !== "")
		const chosen = (pool.length > 0 ? pool : options)[
			Math.floor(Math.random() * (pool.length > 0 ? pool.length : options.length))
		]
		if (!chosen) return false
		element.value = chosen.value
		element.dispatchEvent(new Event("input", {bubbles: true}))
		element.dispatchEvent(new Event("change", {bubbles: true}))
		flash(element)
		return true
	}

	if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
		setNativeValue(element, value)
		flash(element)
		return true
	}
	return false
}

/* ------------------------------------------------------------------ */
/* Collective behaviour                                                */
/* ------------------------------------------------------------------ */

function fillScope(scope: Element, single?: Element) {
	const targets: {element: Element; kind: FieldKind}[] = []

	if (single) {
		const descriptor = describeElement(single)
		if (descriptor && isEligible(single)) {
			targets.push({element: single, kind: detectFieldKind(descriptor)})
		}
	} else {
		const candidates = scope.querySelectorAll("input, textarea, select")
		for (const element of candidates) {
			const descriptor = describeElement(element)
			if (!descriptor || !isEligible(element)) continue
			if (config.onlyEmpty && descriptor.value.trim() !== "") continue
			targets.push({element, kind: detectFieldKind(descriptor)})
		}
	}

	const filledKinds: string[] = []
	let filled = 0
	for (const target of targets) {
		if (fillOne(target.element, target.kind)) {
			filled++
			filledKinds.push(target.kind)
		}
	}

	const uniqueKinds = [...new Set(filledKinds)]
	showToast(
		filled === 0
			? "Nothing to fill here"
			: `Filled ${filled} field${filled === 1 ? "" : "s"}${uniqueKinds.length ? ` · ${uniqueKinds.slice(0, 4).join(", ")}` : ""}`,
		filled === 0,
	)

	try {
		chrome.runtime.sendMessage({
			type: "form-filler:filled",
			payload: {
				host: location.hostname,
				scope: single ? "field" : "form",
				filled,
				kinds: [...new Set(filledKinds)],
			},
		})
	} catch {
		/* service worker asleep — nothing to do */
	}

	return filled
}

let toastTimer: number | undefined

function showToast(message: string, muted = false) {
	if (!config.showToast) return
	let node = document.getElementById("sidedevtools-form-filler-toast")
	if (!node) {
		node = document.createElement("div")
		node.id = "sidedevtools-form-filler-toast"
		node.style.cssText = [
			"position:fixed",
			"z-index:2147483647",
			"bottom:18px",
			"left:50%",
			"transform:translateX(-50%)",
			"padding:6px 12px",
			"border-radius:8px",
			"font:500 12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
			"letter-spacing:-0.01em",
			"box-shadow:0 4px 16px rgba(0,0,0,0.28)",
			"pointer-events:none",
			"transition:opacity 160ms ease-out",
		].join(";")
		document.documentElement.appendChild(node)
	}
	node.style.background = muted ? "#202223" : HIGHLIGHT_COLOR
	node.style.color = "#ffffff"
	node.textContent = message
	node.style.opacity = "1"
	if (toastTimer) window.clearTimeout(toastTimer)
	toastTimer = window.setTimeout(() => {
		node!.style.opacity = "0"
	}, 1600)
}

function formOf(element: Element) {
	return element.closest("form") ?? element.closest("[role='form']")
}

function handleGesture(event: MouseEvent) {
	if (!config.enabled || isPaused()) return
	if (!modifierHeld(event)) return

	const target = event.target as Element | null
	if (!target || !(target instanceof Element)) return
	const field = target.closest("input, textarea, select")
	if (!field) return

	const wantsForm = config.shiftFillsForm ? event.shiftKey : false
	const scope = wantsForm ? (formOf(field) ?? field) : field

	if (wantsForm && scope === field) {
		// No enclosing form — fall back to the whole document body.
		const filled = fillScope(document.body, undefined)
		if (filled === 0) fillScope(document.body, field)
		event.preventDefault()
		event.stopPropagation()
		return
	}

	event.preventDefault()
	event.stopPropagation()
	fillScope(scope, wantsForm ? undefined : field)
}

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

const INSTALLED_FLAG = "__sidedevtoolsFormFillerInstalled"

function install() {
	document.addEventListener("dblclick", handleGesture, true)

	void loadConfig().then(() => {
		// Announce the content script so the panel can show live status.
		try {
			chrome.runtime.sendMessage({
				type: "form-filler:ready",
				payload: {host: location.hostname, id: CONTENT_SCRIPT_ID},
			})
		} catch {}
	})
}

// Registration and on-demand injection can both land on the same page, so make
// sure the gesture listener is only attached once.
const globalScope = window as unknown as Record<string, unknown>
if (!globalScope[INSTALLED_FLAG]) {
	globalScope[INSTALLED_FLAG] = true

	chrome.storage.onChanged.addListener((changes, area) => {
		if (area !== "local" || !changes[CONFIG_KEY]) return
		const next = changes[CONFIG_KEY].newValue as
			| Partial<FormFillerConfig>
			| undefined
		if (!next) return
		config = {...DEFAULT_CONFIG, ...next}
	})

	chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (message?.type === "form-filler:ping") {
			sendResponse({active: config.enabled && !isPaused()})
			return true
		}
		if (message?.type === "form-filler:fill") {
			const mode = message?.payload?.scope === "form" ? "form" : "field"
			const active = document.activeElement?.closest(
				"input, textarea, select",
			) as Element | null | undefined
			if (mode === "field") {
				const target =
					active ??
					(document.querySelector(
						"form input, form textarea, form select",
					) as Element | null)
				sendResponse({filled: target ? fillScope(target, target) : 0, scope: mode})
				return true
			}
			const form = (active && formOf(active)) ?? document.querySelector("form")
			sendResponse({filled: fillScope(form ?? document.body), scope: mode})
			return true
		}
		return undefined
	})

	install()
}

async function loadConfig() {
	try {
		const stored = await chrome.storage.local.get(CONFIG_KEY)
		const value = stored?.[CONFIG_KEY] as Partial<FormFillerConfig> | undefined
		if (value) config = {...DEFAULT_CONFIG, ...value}
	} catch {
		config = {...DEFAULT_CONFIG}
	}
}

