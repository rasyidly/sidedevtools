/**
 * Shared faker engine for SideDevTools.
 *
 * One place that owns the locale registry, the seeded Faker factory, and the
 * `{{path:arg}}` pattern language. Imported by the Form Filler side panel view
 * and its content script, so both always generate identical data.
 *
 * Pattern syntax
 *   {{person.fullName}}                      → value (types preserved)
 *   {{number.int:{"min":1,"max":99}}}        → value with a JSON argument
 *   {{pick:a|b|c}}                           → SideDevTools extra: literal choice
 *   {{index}}                                → SideDevTools extra: 1-based row index
 *   {{color.hex}}                             → SideDevTools extra: #rrggbb
 *   Hi {{person.firstName}}, code {{string.uuid}}
 *   → when an expression sits alone the raw type is kept; inside a longer
 *     string everything is stringified.
 */

import {
	Faker,
	base,
	de,
	en,
	es,
	fr,
	id_ID,
	ja,
	ko,
	pt_BR,
	ru,
	zh_CN,
} from "@faker-js/faker"

export type {Faker}

/* ------------------------------------------------------------------ */
/* Locales                                                             */
/* ------------------------------------------------------------------ */

interface LocaleOption {
	id: string
	label: string
	flag: string
	definition: typeof en
}

export const FAKER_LOCALES: LocaleOption[] = [
	{id: "en", label: "English", flag: "🇺🇸", definition: en},
	{id: "id_ID", label: "Bahasa Indonesia", flag: "🇮🇩", definition: id_ID},
	{id: "de", label: "Deutsch", flag: "🇩🇪", definition: de},
	{id: "fr", label: "Français", flag: "🇫🇷", definition: fr},
	{id: "es", label: "Español", flag: "🇪🇸", definition: es},
	{id: "pt_BR", label: "Português (BR)", flag: "🇧🇷", definition: pt_BR},
	{id: "ja", label: "日本語", flag: "🇯🇵", definition: ja},
	{id: "ko", label: "한국어", flag: "🇰🇷", definition: ko},
	{id: "zh_CN", label: "简体中文", flag: "🇨🇳", definition: zh_CN},
	{id: "ru", label: "Русский", flag: "🇷🇺", definition: ru},
]

export const DEFAULT_LOCALE = "en"

export function localeLabel(id: string) {
	return FAKER_LOCALES.find((locale) => locale.id === id)?.label ?? id
}

/**
 * Build a Faker instance for a locale. `en` and `base` are always appended so
 * partially translated locales never fall through to undefined.
 */
export function createFaker(locale = DEFAULT_LOCALE, seed?: number): Faker {
	const found = FAKER_LOCALES.find((item) => item.id === locale)
	const faker = new Faker({
		locale: found
			? [found.definition, en, base]
			: ([en, base] as [typeof en, typeof base]),
	})
	if (seed !== undefined) faker.seed(seed)
	return faker
}

/* ------------------------------------------------------------------ */
/* Pattern language                                                    */
/* ------------------------------------------------------------------ */

export interface PatternContext {
	/** 1-based row index, exposed as {{index}} */
	index?: number
}

export class PatternError extends Error {}

interface FoundExpression {
	start: number
	end: number
	body: string
}

/**
 * Locate `{{ ... }}` expressions. A plain regex cannot do this because the
 * optional JSON argument contains braces of its own
 * (`{{number.int:{"min":1,"max":9}}}`), so braces are counted instead.
 */
function findExpressions(pattern: string): FoundExpression[] {
	const found: FoundExpression[] = []
	let i = 0
	while (i < pattern.length - 1) {
		if (pattern[i] !== "{" || pattern[i + 1] !== "{") {
			i++
			continue
		}
		let depth = 0
		let j = i + 2
		for (; j < pattern.length; j++) {
			const char = pattern[j]
			if (char === "\\") {
				j++
				continue
			}
			if (char === "{" || char === "[") {
				depth++
				continue
			}
			if (char === "}" || char === "]") {
				if (depth > 0) {
					depth--
					continue
				}
				break
			}
		}
		if (j >= pattern.length) break
		found.push({start: i, end: j + 2, body: pattern.slice(i + 2, j)})
		i = j + 2
	}
	return found
}

export function hasExpression(pattern: string) {
	return findExpressions(pattern).length > 0
}

/** Split `path:argument` on the first colon that is not inside JSON braces. */
function splitExpression(expression: string) {
	let depth = 0
	for (let i = 0; i < expression.length; i++) {
		const char = expression[i]
		if (char === "{" || char === "[") depth++
		else if (char === "}" || char === "]") depth--
		else if (char === ":" && depth === 0) {
			return {path: expression.slice(0, i), argument: expression.slice(i + 1)}
		}
	}
	return {path: expression, argument: undefined as string | undefined}
}

function parseArgument(raw: string | undefined) {
	if (raw === undefined) return undefined
	const trimmed = raw.trim()
	if (trimmed === "") return undefined
	try {
		return JSON.parse(trimmed)
	} catch {
		return trimmed
	}
}

/** Resolve one expression body (the text between `{{` and `}}`). */
export function resolveExpression(
	faker: Faker,
	body: string,
	context: PatternContext = {},
): unknown {
	const expression = body.trim()

	// SideDevTools extras
	if (expression === "index") return context.index ?? 1
	if (expression === "color.hex") {
		const value = faker.number.int({min: 0, max: 0xffffff})
		return `#${value.toString(16).padStart(6, "0")}`
	}
	if (expression.startsWith("pick:")) {
		const choices = expression
			.slice(5)
			.split("|")
			.map((choice) => choice.trim())
			.filter(Boolean)
		if (choices.length === 0) return ""
		return faker.helpers.arrayElement(choices)
	}
	if (expression === "boolean") return faker.number.int({min: 0, max: 1}) === 1
	if (expression.startsWith("boolean:")) {
		const rate = Number(expression.slice(8))
		const probability = Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 0.5
		return faker.number.float({min: 0, max: 1}) < probability
	}

	const {path, argument} = splitExpression(expression)
	const segments = path.split(".")
	if (segments.some((segment) => !segment)) {
		throw new PatternError(`Unknown path: ${path}`)
	}

	let owner = faker as unknown as Record<string, unknown>
	for (let i = 0; i < segments.length - 1; i++) {
		const next = owner[segments[i]]
		if (next === null || typeof next !== "object") {
			throw new PatternError(`Unknown path: ${path}`)
		}
		owner = next as Record<string, unknown>
	}

	const fn = owner[segments[segments.length - 1]]
	if (typeof fn !== "function") {
		throw new PatternError(`Unknown path: ${path}`)
	}

	const value =
		argument === undefined
			? (fn as () => unknown).call(owner)
			: (fn as (arg: unknown) => unknown).call(owner, parseArgument(argument))
	if (value === undefined) throw new PatternError(`No result from ${path}`)
	return value
}

/** Resolve a full pattern. Single expressions keep their native type. */
export function resolvePattern(
	faker: Faker,
	pattern: string,
	context: PatternContext = {},
): unknown {
	const expressions = findExpressions(pattern)
	if (expressions.length === 0) return pattern
	if (expressions.length === 1 && expressions[0].start === 0 && expressions[0].end === pattern.length) {
		return resolveExpression(faker, expressions[0].body, context)
	}
	let output = ""
	let cursor = 0
	for (const expression of expressions) {
		output += pattern.slice(cursor, expression.start)
		output += stringify(resolveExpression(faker, expression.body, context))
		cursor = expression.end
	}
	return output + pattern.slice(cursor)
}

export function stringify(value: unknown): string {
	if (value === null || value === undefined) return ""
	if (value instanceof Date) return value.toISOString()
	if (typeof value === "object") return JSON.stringify(value)
	return String(value)
}

/** Render a pattern as a string — used when filling form fields. */
export function renderPattern(
	faker: Faker,
	pattern: string,
	context: PatternContext = {},
): string {
	return stringify(resolvePattern(faker, pattern, context))
}

/** Returns an error message when a pattern cannot be resolved, else null. */
export function validatePattern(faker: Faker, pattern: string): string | null {
	if (!pattern.trim()) return "Pattern is empty"
	try {
		resolvePattern(faker, pattern, {index: 1})
		return null
	} catch (error) {
		return error instanceof Error ? error.message : String(error)
	}
}

/* ------------------------------------------------------------------ */
/* Pattern catalog                                                     */
/* ------------------------------------------------------------------ */

export interface CatalogItem {
	label: string
	pattern: string
}

export interface CatalogGroup {
	group: string
	items: CatalogItem[]
}

export const PATTERN_CATALOG: CatalogGroup[] = [
	{
		group: "Person",
		items: [
			{label: "Full name", pattern: "{{person.fullName}}"},
			{label: "First name", pattern: "{{person.firstName}}"},
			{label: "Last name", pattern: "{{person.lastName}}"},
			{label: "Job title", pattern: "{{person.jobTitle}}"},
			{label: "Bio", pattern: "{{person.bio}}"},
			{label: "Zodiac", pattern: "{{person.zodiacSign}}"},
			{label: "Avatar (SVG data URI)", pattern: "{{image.dataUri}}"},
		],
	},
	{
		group: "Internet",
		items: [
			{label: "Email", pattern: "{{internet.email}}"},
			{label: "Username", pattern: "{{internet.username}}"},
			{label: "URL", pattern: "{{internet.url}}"},
			{label: "Domain", pattern: "{{internet.domainName}}"},
			{label: "IPv4", pattern: "{{internet.ipv4}}"},
			{label: "MAC address", pattern: "{{internet.mac}}"},
			{label: "User agent", pattern: "{{internet.userAgent}}"},
			{label: "Password", pattern: "{{internet.password}}"},
			{label: "HTTP status", pattern: "{{internet.httpStatusCode}}"},
			{label: "Emoji", pattern: "{{internet.emoji}}"},
		],
	},
	{
		group: "Location",
		items: [
			{label: "City", pattern: "{{location.city}}"},
			{label: "Country", pattern: "{{location.country}}"},
			{label: "Country code", pattern: "{{location.countryCode}}"},
			{label: "Street address", pattern: "{{location.streetAddress}}"},
			{label: "Secondary address", pattern: "{{location.secondaryAddress}}"},
			{label: "State / province", pattern: "{{location.state}}"},
			{label: "Zip / postal code", pattern: "{{location.zipCode}}"},
			{label: "Latitude", pattern: '{{location.latitude:{"min":-90,"max":90,"precision":6}}}'},
			{label: "Longitude", pattern: '{{location.longitude:{"min":-180,"max":180,"precision":6}}}'},
			{label: "Timezone", pattern: "{{location.timeZone}}"},
		],
	},
	{
		group: "Company",
		items: [
			{label: "Company name", pattern: "{{company.name}}"},
			{label: "Catch phrase", pattern: "{{company.catchPhrase}}"},
			{label: "Buzz phrase", pattern: "{{company.buzzPhrase}}"},
		],
	},
	{
		group: "Commerce",
		items: [
			{label: "Product name", pattern: "{{commerce.productName}}"},
			{label: "Product description", pattern: "{{commerce.productDescription}}"},
			{label: "Product adjective", pattern: "{{commerce.productAdjective}}"},
			{label: "Material", pattern: "{{commerce.productMaterial}}"},
			{label: "Department", pattern: "{{commerce.department}}"},
			{label: "Price", pattern: '{{number.float:{"min":5,"max":500,"fractionDigits":2}}}'},
			{label: "Barcode / UPC", pattern: "{{commerce.upc}}"},
			{label: "ISBN", pattern: "{{commerce.isbn}}"},
		],
	},
	{
		group: "Finance",
		items: [
			{label: "Money amount", pattern: '{{number.float:{"min":1,"max":9999,"fractionDigits":2}}}'},
			{label: "Account number", pattern: "{{finance.accountNumber}}"},
			{label: "Currency code", pattern: "{{finance.currencyCode}}"},
			{label: "IBAN", pattern: "{{finance.iban}}"},
			{label: "Credit card number", pattern: "{{finance.creditCardNumber}}"},
			{label: "Credit card CVV", pattern: "{{finance.creditCardCVV}}"},
			{label: "Credit card issuer", pattern: "{{finance.creditCardIssuer}}"},
			{label: "PIN", pattern: "{{finance.pin}}"},
			{label: "Bitcoin address", pattern: "{{finance.bitcoinAddress}}"},
			{label: "Ethereum address", pattern: "{{finance.ethereumAddress}}"},
		],
	},
	{
		group: "Numbers & IDs",
		items: [
			{label: "Integer 1-1000", pattern: '{{number.int:{"min":1,"max":1000}}}'},
			{label: "Integer 1-5 (rating)", pattern: '{{number.int:{"min":1,"max":5}}}'},
			{label: "Float 2 decimals", pattern: '{{number.float:{"min":0,"max":100,"fractionDigits":2}}}'},
			{label: "Boolean", pattern: '{{number.int:{"min":0,"max":1}}}'},
			{label: "Roman numeral", pattern: '{{number.romanNumeral:{"min":1,"max":50}}}'},
			{label: "UUID v4", pattern: "{{string.uuid}}"},
			{label: "NanoID", pattern: "{{string.nanoid}}"},
			{label: "ULID", pattern: "{{string.ulid}}"},
			{label: "Alphanumeric (8)", pattern: '{{string.alphanumeric:{"length":8}}}'},
			{label: "Numeric (6)", pattern: '{{string.numeric:{"length":6}}}'},
			{label: "Hex color", pattern: "{{color.hex}}"},
			{label: "Slug", pattern: "{{lorem.slug}}"},
		],
	},
	{
		group: "Dates",
		items: [
			{label: "Recent (30 days)", pattern: '{{date.recent:{"days":30}}}'},
			{label: "Past", pattern: "{{date.past}}"},
			{label: "Future", pattern: "{{date.future}}"},
			{label: "Between two dates", pattern: '{{date.between:{"from":"2024-01-01T00:00:00.000Z","to":"2026-12-31T00:00:00.000Z"}}'},
			{label: "Birthdate (adult)", pattern: '{{date.birthdate:{"min":18,"max":65}}}'},
			{label: "Weekday", pattern: "{{date.weekday}}"},
			{label: "Month", pattern: "{{date.month}}"},
			{label: "Timestamp (ms)", pattern: '{{date.anytime:{"refDate":"2026-01-01T00:00:00.000Z"}}}'},
		],
	},
	{
		group: "Text",
		items: [
			{label: "Sentence", pattern: "{{lorem.sentence}}"},
			{label: "Paragraph", pattern: "{{lorem.paragraph}}"},
			{label: "Two paragraphs", pattern: "{{lorem.paragraphs:2}}"},
			{label: "Three words", pattern: "{{lorem.words:3}}"},
			{label: "Lines", pattern: "{{lorem.lines:3}}"},
			{label: "Word", pattern: "{{word.noun}}"},
			{label: "Adjective", pattern: "{{word.adjective}}"},
		],
	},
	{
		group: "Tech",
		items: [
			{label: "File name", pattern: "{{system.fileName}}"},
			{label: "File path", pattern: "{{system.filePath}}"},
			{label: "MIME type", pattern: "{{system.mimeType}}"},
			{label: "Semver", pattern: "{{system.semver}}"},
			{label: "Git branch", pattern: "{{git.branch}}"},
			{label: "Commit SHA", pattern: "{{git.commitSha}}"},
			{label: "Commit message", pattern: "{{git.commitMessage}}"},
			{label: "DB column", pattern: "{{database.column}}"},
			{label: "DB engine", pattern: "{{database.engine}}"},
			{label: "Mongo ObjectId", pattern: "{{database.mongodbObjectId}}"},
			{label: "Cron expression", pattern: "{{system.cron}}"},
			{label: "Hacker phrase", pattern: "{{hacker.phrase}}"},
		],
	},
	{
		group: "Lifestyle",
		items: [
			{label: "Phone number", pattern: "{{phone.number}}"},
			{label: "Vehicle", pattern: "{{vehicle.vehicle}}"},
			{label: "VIN", pattern: "{{vehicle.vin}}"},
			{label: "Plate / VRM", pattern: "{{vehicle.vrm}}"},
			{label: "Book title", pattern: "{{book.title}}"},
			{label: "Book author", pattern: "{{book.author}}"},
			{label: "Song name", pattern: "{{music.songName}}"},
			{label: "Song artist", pattern: "{{music.artist}}"},
			{label: "Dish", pattern: "{{food.dish}}"},
			{label: "Ingredient", pattern: "{{food.ingredient}}"},
			{label: "Dog breed", pattern: "{{animal.dog}}"},
			{label: "Pet name", pattern: "{{animal.petName}}"},
			{label: "Airline", pattern: "{{airline.airline}}"},
			{label: "Flight number", pattern: "{{airline.flightNumber}}"},
			{label: "Chemical element", pattern: "{{science.chemicalElement}}"},
		],
	},
	{
		group: "SideDevTools extras",
		items: [
			{label: "Row index", pattern: "{{index}}"},
			{label: "Boolean", pattern: "{{boolean}}"},
			{label: "Boolean (30% true)", pattern: "{{boolean:0.3}}"},
			{label: "Random pick", pattern: "{{pick:draft|active|archived}}"},
			{label: "Template mix", pattern: "{{person.firstName}}.{{person.lastName}}@{{internet.domainName}}"},
			{label: "MM/YY expiry", pattern: '{{number.int:{"min":1,"max":12}}}/{{number.int:{"min":26,"max":32}}}'},
		],
	},
]

export const ALL_CATALOG_ITEMS: CatalogItem[] = PATTERN_CATALOG.flatMap(
	(group) => group.items,
)
