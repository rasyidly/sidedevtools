/**
 * QR payload builder — turns a content template into the exact string that gets
 * encoded, following the de-facto conventions each scanner expects.
 */

export type ContentKind =
	| "text"
	| "url"
	| "wifi"
	| "vcard"
	| "email"
	| "sms"
	| "tel"
	| "geo"
	| "otp"

export interface QrFields {
	text: string
	url: string
	ssid: string
	password: string
	security: "WPA" | "WEP" | "nopass"
	hidden: boolean
	firstName: string
	lastName: string
	org: string
	phone: string
	email: string
	website: string
	street: string
	city: string
	region: string
	postalCode: string
	country: string
	subject: string
	message: string
	latitude: string
	longitude: string
	otpIssuer: string
	otpLabel: string
	otpSecret: string
}

export const DEFAULT_FIELDS: QrFields = {
	text: "SideDevTools — privacy-first developer companion",
	url: "https://google.com",
	ssid: "SideDevTools-Guest",
	password: "correct-horse-battery",
	security: "WPA",
	hidden: false,
	firstName: "John",
	lastName: "Doe",
	org: "SideDevTools",
	phone: "+62 812 3456 7890",
	email: "hello@side-dev.tools",
	website: "https://example.com",
	street: "Jl. Terserah No. 10",
	city: "Yogyakarta",
	region: "West Java",
	postalCode: "12345",
	country: "Indonesia",
	subject: "Hello from SideDevTools",
	message: "Scanning works — this message travelled inside a QR code.",
	latitude: "-6.9175",
	longitude: "107.6191",
	otpIssuer: "ACME",
	otpLabel: "johndoe@example.com",
	otpSecret: "JBSWY3DPEHPK3PXP",
}

export const CONTENT_KINDS: { id: ContentKind; label: string }[] = [
	{ id: "text", label: "Text" },
	{ id: "url", label: "URL" },
	{ id: "wifi", label: "WiFi" },
	{ id: "vcard", label: "Contact" },
	{ id: "email", label: "Email" },
	{ id: "sms", label: "SMS" },
	{ id: "tel", label: "Phone" },
	{ id: "geo", label: "Location" },
	{ id: "otp", label: "OTP" },
]

export interface FieldSpec {
	key: keyof QrFields
	label: string
	placeholder?: string
	multiline?: boolean
	half?: boolean
}

export const KIND_FIELDS: Record<ContentKind, FieldSpec[]> = {
	text: [{ key: "text", label: "Text", multiline: true }],
	url: [{ key: "url", label: "Destination URL" }],
	wifi: [
		{ key: "ssid", label: "Network name (SSID)" },
		{ key: "password", label: "Password" },
		{ key: "security", label: "Security" },
	],
	vcard: [
		{ key: "firstName", label: "First name", half: true },
		{ key: "lastName", label: "Last name", half: true },
		{ key: "org", label: "Organization" },
		{ key: "phone", label: "Phone" },
		{ key: "email", label: "Email" },
		{ key: "website", label: "Website" },
		{ key: "street", label: "Street" },
		{ key: "city", label: "City", half: true },
		{ key: "region", label: "Region", half: true },
		{ key: "postalCode", label: "Postal code", half: true },
		{ key: "country", label: "Country", half: true },
	],
	email: [
		{ key: "email", label: "To" },
		{ key: "subject", label: "Subject" },
		{ key: "message", label: "Body", multiline: true },
	],
	sms: [
		{ key: "phone", label: "Phone number" },
		{ key: "message", label: "Message", multiline: true },
	],
	tel: [{ key: "phone", label: "Phone number" }],
	geo: [
		{ key: "latitude", label: "Latitude", half: true },
		{ key: "longitude", label: "Longitude", half: true },
	],
	otp: [
		{ key: "otpIssuer", label: "Issuer", half: true },
		{ key: "otpLabel", label: "Account", half: true },
		{ key: "otpSecret", label: "Secret (Base32)" },
	],
}

/** Escape a value for the `WIFI:` MECARD-style payload. */
function wifiEscape(value: string): string {
	return value.replace(/([\\;,:"])/g, "\\$1")
}

/** Escape a value for vCard 3.0. */
function vcardEscape(value: string): string {
	return value.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n")
}

function normalizeUrl(value: string): string {
	const trimmed = value.trim()
	if (!trimmed) return ""
	if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed
	return "https://" + trimmed
}

export interface BuiltPayload {
	text: string
	error: string | null
}

/** Build the exact encoded string for a content template. */
export function buildPayload(
	kind: ContentKind,
	fields: QrFields,
): BuiltPayload {
	const value = (key: keyof QrFields) => String(fields[key] ?? "").trim()

	switch (kind) {
		case "text": {
			const text = value("text")
			return text
				? { text, error: null }
				: { text: "", error: "Enter some text to encode." }
		}
		case "url": {
			const url = normalizeUrl(fields.url)
			return url
				? { text: url, error: null }
				: { text: "", error: "Enter a URL to encode." }
		}
		case "wifi": {
			const ssid = value("ssid")
			if (!ssid) return { text: "", error: "A network name is required." }
			const parts = [`T:${fields.security}`]
			parts.push(`S:${wifiEscape(ssid)}`)
			if (fields.security !== "nopass" && value("password")) {
				parts.push(`P:${wifiEscape(value("password"))}`)
			}
			if (fields.hidden) parts.push("H:true")
			return { text: `WIFI:${parts.join(";")};;`, error: null }
		}
		case "vcard": {
			const lines = ["BEGIN:VCARD", "VERSION:3.0"]
			const first = value("firstName")
			const last = value("lastName")
			const full = [first, last].filter(Boolean).join(" ")
			if (!first && !last) {
				return { text: "", error: "Add at least a first or last name." }
			}
			lines.push(`N:${vcardEscape(last)};${vcardEscape(first)};;;`)
			lines.push(`FN:${vcardEscape(full)}`)
			if (value("org")) lines.push(`ORG:${vcardEscape(value("org"))}`)
			if (value("phone")) lines.push(`TEL;TYPE=CELL:${value("phone")}`)
			if (value("email")) lines.push(`EMAIL:${value("email")}`)
			if (value("website")) {
				lines.push(`URL:${normalizeUrl(fields.website)}`)
			}
			const address = [
				"",
				"",
				value("street"),
				value("city"),
				value("region"),
				value("postalCode"),
				value("country"),
			]
			if (address.slice(2).some(Boolean)) {
				lines.push(
					`ADR;TYPE=HOME:${address
						.map((part) => vcardEscape(part))
						.join(";")}`,
				)
			}
			lines.push("END:VCARD")
			return { text: lines.join("\n"), error: null }
		}
		case "email": {
			const to = value("email")
			if (!to) return { text: "", error: "An email address is required." }
			const params = new URLSearchParams()
			if (value("subject")) params.set("subject", value("subject"))
			if (value("message")) params.set("body", value("message"))
			const query = params.toString()
			return { text: `mailto:${to}${query ? `?${query}` : ""}`, error: null }
		}
		case "sms": {
			const phone = value("phone")
			if (!phone) return { text: "", error: "A phone number is required." }
			const message = value("message")
			return {
				text: message ? `SMSTO:${phone}:${message}` : `SMSTO:${phone}`,
				error: null,
			}
		}
		case "tel": {
			const phone = value("phone")
			return phone
				? { text: `tel:${phone}`, error: null }
				: { text: "", error: "A phone number is required." }
		}
		case "geo": {
			const latitude = value("latitude")
			const longitude = value("longitude")
			if (!latitude || !longitude) {
				return { text: "", error: "Both latitude and longitude are needed." }
			}
			const lat = Number(latitude)
			const lng = Number(longitude)
			if (Number.isNaN(lat) || Number.isNaN(lng)) {
				return { text: "", error: "Coordinates must be numbers." }
			}
			return { text: `geo:${lat},${lng}`, error: null }
		}
		case "otp": {
			const secret = value("otpSecret").replace(/[\s-]/g, "").toUpperCase()
			if (!/^[A-Z2-7]{8,}$/.test(secret)) {
				return {
					text: "",
					error: "Secret must be Base32 (A–Z, 2–7).",
				}
			}
			const issuer = value("otpIssuer")
			const account = value("otpLabel") || issuer || "account"
			const label = issuer
				? `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
				: encodeURIComponent(account)
			const params = new URLSearchParams({ secret })
			if (issuer) params.set("issuer", issuer)
			return {
				text: `otpauth://totp/${label}?${params.toString()}`,
				error: null,
			}
		}
	}
}

/** Human label for what a scanned value looks like, for the result card. */
export function describeScanValue(raw: string): string | null {
	const value = raw.trim()
	if (/^https?:\/\//i.test(value)) return "Link"
	if (value.startsWith("otpauth://")) return "Authenticator"
	if (value.startsWith("WIFI:")) return "WiFi"
	if (value.startsWith("BEGIN:VCARD")) return "Contact"
	if (value.startsWith("mailto:")) return "Email"
	if (value.startsWith("sms:") || value.startsWith("SMSTO:")) return "SMS"
	if (value.startsWith("tel:")) return "Phone"
	if (value.startsWith("geo:")) return "Location"
	return null
}
