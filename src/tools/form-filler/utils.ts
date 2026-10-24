/**
 * Form Filler engine — shared configuration, field recognition and pattern
 * defaults. Imported by the side panel UI *and* by the injected content script
 * so both agree on what a field is and what should fill it.
 */

export type Modifier = "meta" | "ctrl" | "alt"

export interface FormFillerConfig {
	enabled: boolean
	locale: string
	/** 0 = fresh random data on every fill, otherwise a fixed seed. */
	seed: number
	modifier: Modifier
	/** Shift + gesture fills the whole form instead of one field. */
	shiftFillsForm: boolean
	onlyEmpty: boolean
	showHighlight: boolean
	fillSelects: boolean
	showToast: boolean
	pausedHosts: string[]
	/** kind -> pattern override */
	overrides: Record<string, string>
}

export const CONFIG_KEY = "SideDevTools_form_filler"

const isMac = () =>
	typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)

export const DEFAULT_CONFIG: FormFillerConfig = {
	enabled: false,
	locale: "en",
	seed: 0,
	modifier: isMac() ? "meta" : "ctrl",
	shiftFillsForm: true,
	onlyEmpty: true,
	showHighlight: true,
	fillSelects: true,
	showToast: true,
	pausedHosts: [],
	overrides: {},
}

/** Field kinds the filler can recognise. */
export const FIELD_KINDS = [
	"email",
	"firstname",
	"lastname",
	"fullname",
	"username",
	"password",
	"tel",
	"url",
	"company",
	"jobtitle",
	"address",
	"address2",
	"city",
	"state",
	"zip",
	"country",
	"creditcard",
	"cvv",
	"expiry",
	"iban",
	"date",
	"time",
	"number",
	"price",
	"quantity",
	"age",
	"search",
	"color",
	"message",
	"text",
] as const

export type FieldKind = (typeof FIELD_KINDS)[number]

export interface FieldDescriptor {
	tag: string
	type: string
	name: string
	id: string
	placeholder: string
	autocomplete: string
	label: string
	/** defaultValue/value already present in the DOM */
	value: string
}

/** The pattern used for each recognised kind. Users can override any of them. */
export const KIND_PATTERNS: Record<FieldKind, string> = {
	email: "{{internet.email}}",
	firstname: "{{person.firstName}}",
	lastname: "{{person.lastName}}",
	fullname: "{{person.fullName}}",
	username: "{{internet.username}}",
	password: '{{internet.password:{"length":16,"memorable":false}}}',
	tel: "{{phone.number}}",
	url: "{{internet.url}}",
	company: "{{company.name}}",
	jobtitle: "{{person.jobTitle}}",
	address: "{{location.streetAddress}}",
	address2: "{{location.secondaryAddress}}",
	city: "{{location.city}}",
	state: "{{location.state}}",
	zip: "{{location.zipCode}}",
	country: "{{location.country}}",
	creditcard: "{{finance.creditCardNumber}}",
	cvv: "{{finance.creditCardCVV}}",
	expiry: '{{number.int:{"min":1,"max":12}}}/{{number.int:{"min":26,"max":32}}}',
	iban: "{{finance.iban}}",
	date: "{{date.recent}}",
	time: "{{date.recent}}",
	number: '{{number.int:{"min":1,"max":999}}}',
	price: '{{number.float:{"min":5,"max":900,"fractionDigits":2}}}',
	quantity: '{{number.int:{"min":1,"max":12}}}',
	age: '{{number.int:{"min":18,"max":70}}}',
	search: "{{lorem.words:3}}",
	color: "{{color.hex}}",
	message: "{{lorem.sentences:2}}",
	text: "{{lorem.words:4}}",
}

export const KIND_LABELS: Record<FieldKind, string> = {
	email: "Email",
	firstname: "First name",
	lastname: "Last name",
	fullname: "Full name",
	username: "Username",
	password: "Password",
	tel: "Phone",
	url: "URL",
	company: "Company",
	jobtitle: "Job title",
	address: "Street address",
	address2: "Address line 2",
	city: "City",
	state: "State / province",
	zip: "Zip / postal code",
	country: "Country",
	creditcard: "Card number",
	cvv: "Card CVV",
	expiry: "Card expiry",
	iban: "IBAN",
	date: "Date",
	time: "Time",
	number: "Number",
	price: "Price",
	quantity: "Quantity",
	age: "Age",
	search: "Search query",
	color: "Color",
	message: "Long message",
	text: "Short text",
}

/* ------------------------------------------------------------------ */
/* Recognition                                                         */
/* ------------------------------------------------------------------ */

interface Rule {
	kind: FieldKind
	test: RegExp
}

/** Ordered autocomplete tokens — the most reliable signal in the DOM. */
const AUTOCOMPLETE_RULES: Rule[] = [
	{kind: "email", test: /^email$/},
	{kind: "tel", test: /^(tel|tel-national)$/},
	{kind: "firstname", test: /^given-name$/},
	{kind: "lastname", test: /^family-name$/},
	{kind: "fullname", test: /^name$/},
	{kind: "username", test: /^username$/},
	{kind: "password", test: /^(current|new|one-time)-password$/},
	{kind: "jobtitle", test: /^organization-title$/},
	{kind: "company", test: /^organization$/},
	{kind: "address", test: /^(street-address|address-line1)$/},
	{kind: "address2", test: /^address-line2$/},
	{kind: "city", test: /^(address-level2|locality)$/},
	{kind: "state", test: /^address-level1$/},
	{kind: "zip", test: /^postal-code$/},
	{kind: "country", test: /^(country|country-name)$/},
	{kind: "creditcard", test: /^cc-number$/},
	{kind: "cvv", test: /^cc-csc$/},
	{kind: "expiry", test: /^cc-exp/},
	{kind: "date", test: /^bday$/},
]

/** Keyword rules — checked against name, id, placeholder and <label> text. */
const KEYWORD_RULES: Rule[] = [
	{kind: "email", test: /(^|[^a-z])(e ?mail|email)([^a-z]|$)/},
	{kind: "firstname", test: /(first name|fname|given name|nama depan)/},
	{kind: "lastname", test: /(last name|lname|surname|family name|nama belakang)/},
	{kind: "fullname", test: /(full name|your name|display name|complete name|nama lengkap|nama|(^|\s)name(\s|$))/},
	{kind: "username", test: /(user ?name|login|nick ?name|handle|screen ?name|username)/},
	{kind: "password", test: /(pass ?word|passphrase|pwd|sandi|secret key)/},
	{kind: "creditcard", test: /(card number|credit ?card|cc num|nomor kartu|kartu kredit)/},
	{kind: "cvv", test: /(\bcvv\b|\bcvc\b|\bcsc\b|\bcvn\b|security code)/},
	{kind: "expiry", test: /(expir|\bexp\b|valid thru|kadaluarsa)/},
	{kind: "iban", test: /(\biban\b|rekening|account number|norek)/},
	{kind: "tel", test: /(phone|telephone|\btel\b|mobile|whatsapp|handphone|hp number|nomor hp|\bwa\b)/},
	{kind: "jobtitle", test: /(job ?title|position|jabatan|occupation|role ?title)/},
	{kind: "company", test: /(company|organi[sz]ation|employer|perusahaan|bisnis|business ?name)/},
	{kind: "address2", test: /(address ?2|address line ?2|apartment|\bapt\b|suite|\bunit\b)/},
	{kind: "address", test: /(address|street|alamat|jalan|addr)/},
	{kind: "city", test: /(city|town|kota|kabupaten|municipality)/},
	{kind: "state", test: /(state|province|provinsi|region|wilayah|county)/},
	{kind: "zip", test: /(\bzip\b|postal|post ?code|postcode|kode pos)/},
	{kind: "country", test: /(country|negara|nationality)/},
	{kind: "url", test: /(\burl\b|website|web ?site|homepage|link|domain)/},
	{kind: "search", test: /(\bsearch\b|\bquery\b|(^|\s)q(\s|$)|keyword|pencarian|cari)/},
	{kind: "quantity", test: /(quantity|\bqty\b|jumlah|stok|stock|count)/},
	{kind: "price", test: /(price|amount|total|subtotal|harga|biaya|cost|salary|gaji)/},
	{kind: "age", test: /(\bage\b|umur|usia)/},
	{kind: "date", test: /(date|birth|lahir|\bdob\b|tanggal|jadwal)/},
	{kind: "message", test: /(message|comment|description|bio|note|pesan|keterangan|catatan|feedback|review|subject|judul|title)/},
]

/**
 * Work out what a field expects. Autocomplete wins, then the input type, then
 * keywords found in name/id/placeholder/label. Falls back to a generic value
 * based on the element type.
 */
export function detectFieldKind(field: FieldDescriptor): FieldKind {
	const type = (field.type || "text").toLowerCase()
	// Normalise separators so `user_age`, `user-age` and "User Age" all become
	// "user age" before the keyword rules run.
	const haystack = [field.name, field.id, field.placeholder, field.label]
		.join(" ")
		.toLowerCase()
		.replace(/[\u2010-\u2015]/g, "-")
		.replace(/[\s_-]+/g, " ")
		.trim()

	const autocomplete = (field.autocomplete || "").toLowerCase().trim()
	if (autocomplete && autocomplete !== "off" && autocomplete !== "on") {
		const tokens = autocomplete.split(/\s+/).filter((token) => token !== "section-*")
		for (const token of tokens) {
			const rule = AUTOCOMPLETE_RULES.find((candidate) => candidate.test.test(token))
			if (rule) return rule.kind
		}
	}

	// Search first: an input[type=search] is a search box even if named "q".
	if (type === "search") return "search"

	const keyword = KEYWORD_RULES.find((rule) => rule.test.test(haystack))
	if (keyword) return keyword.kind

	switch (type) {
		case "email":
			return "email"
		case "tel":
			return "tel"
		case "url":
			return "url"
		case "password":
			return "password"
		case "number":
			return "number"
		case "range":
			return "number"
		case "date":
		case "month":
		case "week":
		case "datetime-local":
			return "date"
		case "time":
			return "time"
		case "color":
			return "color"
		default:
			break
	}

	if (field.tag === "textarea") return "message"
	if (/kolom|panjang|description/.test(haystack)) return "message"
	return "text"
}

/** Resolve the pattern for a kind, honouring user overrides. */
export function patternForKind(
	kind: FieldKind,
	config: Pick<FormFillerConfig, "overrides">,
) {
	return config.overrides[kind] ?? KIND_PATTERNS[kind]
}

