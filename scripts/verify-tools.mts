import {strict as assert} from "node:assert"

// Minimal browser shims so the engines can be exercised outside the extension.
globalThis.localStorage = {
	store: new Map(),
	getItem(key) {
		return this.store.has(key) ? this.store.get(key) : null
	},
	setItem(key, value) {
		this.store.set(key, String(value))
	},
	removeItem(key) {
		this.store.delete(key)
	},
}

import {
	analyzeContrast,
	apcaContrast,
	describeColor,
	extractPalette,
	generateScale,
	nearestNamedColor,
	nearestTailwindToken,
	parseColor,
	toHex,
} from "../src/tools/color-toolkit/utils.ts"
import {
	buildSegments,
	explainRegex,
	runRegex,
} from "../src/tools/regex-tester/utils.ts"
import {
	ALL_CATALOG_ITEMS,
	PATTERN_CATALOG,
	createFaker,
	renderPattern,
	resolvePattern,
	validatePattern,
} from "../src/lib/faker.ts"
import type {Faker} from "../src/lib/faker.ts"
import {
	DEFAULT_CONFIG,
	FIELD_KINDS,
	KIND_PATTERNS,
	detectFieldKind,
	patternForKind,
} from "../src/tools/form-filler/utils.ts"
import type {FieldDescriptor} from "../src/tools/form-filler/utils.ts"

let checks = 0
const section = (name: string) => console.log(`\n▸ ${name}`)
const ok = (label: string) => {
	checks++
	void label
}

/* ------------------------------------------------------------------ */
section("color toolkit")

const samples = [
	"#008060",
	"#34d399",
	"rgb(0 128 96)",
	"hsl(165 100% 25%)",
	"oklch(59% 0.11 165)",
	"rebeccapurple",
	"#fff",
	"#00806080",
	"rgb(0 0 0 / 50%)",
	"transparent",
]
for (const sample of samples) {
	assert.ok(parseColor(sample), `failed parsing ${sample}`)
}
assert.equal(parseColor("#fff")!.r, 255)
assert.equal(parseColor("#00806080")!.a.toFixed(2), "0.50")
assert.equal(toHex({r: 0, g: 128, b: 96, a: 1}), "#008060")
assert.equal(describeColor(parseColor("#008060")!).rgb, "rgb(0 128 96)")
assert.ok(nearestNamedColor(parseColor("#008060")!).name.length > 0)

const white = parseColor("#ffffff")!
const black = parseColor("#000000")!
assert.equal(analyzeContrast(black, white).ratio, 21)
assert.ok(Math.abs(apcaContrast(white, black) + 108) < 1, "APCA white/black ≈ -107.9")
assert.ok(apcaContrast(black, white) > 100)

const scale = generateScale(parseColor("#008060")!)
assert.equal(scale.length, 11)
const luminance = (hex: string) => {
	const parsed = parseColor(hex)!
	return 0.2126 * parsed.r + 0.7152 * parsed.g + 0.0722 * parsed.b
}
assert.ok(luminance(scale[0].hex) > 200 && luminance(scale[10].hex) < 80)
for (const step of scale) assert.match(step.hex, /^#[0-9a-f]{6}$/)
console.log("  ramp:", scale.map((s) => `${s.shade}:${s.hex}`).join(" "))
console.log("  nearest token for #008060:", nearestTailwindToken(parseColor("#008060")!))

const pixels = new Uint8ClampedArray(100 * 4)
for (let i = 0; i < 100; i++) {
	const offset = i * 4
	if (i < 50) pixels[offset] = 255
	else pixels[offset + 2] = 255
	pixels[offset + 3] = 255
}
assert.equal(extractPalette(pixels, 3).length, 2)
ok("color")

/* ------------------------------------------------------------------ */
section("regex playground")

const regexResult = runRegex("(?<key>[A-Z_]+)=(?<value>[^;]+)", "g", "MODE=production;DEBUG=false")
assert.equal(regexResult.error, null)
assert.equal(regexResult.matches.length, 2)
assert.deepEqual(regexResult.matches[0].named, {key: "MODE", value: "production"})
assert.equal(
	buildSegments("a1 b2", runRegex("\\d", "g", "a1 b2").matches)
		.filter((segment) => segment.isMatch)
		.length,
	2,
)
const explained = explainRegex("^(?<y>\\d{4})-(\\d{2})$")
assert.ok(explained.some((token) => token.desc.includes("exactly 4 times")))
assert.ok(explained.some((token) => token.desc.includes('named "y"')))
assert.ok(runRegex("([a-z", "", "abc").error)
ok("regex")

/* ------------------------------------------------------------------ */
section("faker pattern engine")

const faker: Faker = createFaker("en", 42)

// Every catalog pattern must resolve.
const catalogFailures: string[] = []
for (const item of ALL_CATALOG_ITEMS) {
	const error = validatePattern(faker, item.pattern)
	if (error) catalogFailures.push(`${item.label} → ${item.pattern} :: ${error}`)
}
assert.deepEqual(catalogFailures, [], `catalog patterns failed:\n${catalogFailures.join("\n")}`)
assert.ok(PATTERN_CATALOG.length >= 10)

// Every field kind pattern must resolve and produce a non-empty value.
const kindFailures: string[] = []
for (const kind of FIELD_KINDS) {
	const error = validatePattern(faker, KIND_PATTERNS[kind])
	if (error) kindFailures.push(`${kind} → ${KIND_PATTERNS[kind]} :: ${error}`)
	else if (!renderPattern(faker, KIND_PATTERNS[kind]).trim())
		kindFailures.push(`${kind} produced an empty value`)
}
assert.deepEqual(kindFailures, [], `kind patterns failed:\n${kindFailures.join("\n")}`)

// Types are preserved for bare expressions and stringified inside templates.
assert.equal(typeof resolvePattern(faker, "{{boolean}}"), "boolean")
assert.equal(typeof resolvePattern(faker, "{{number.int:{\"min\":1,\"max\":9}}}"), "number")
assert.equal(typeof resolvePattern(faker, "Hi {{person.firstName}}"), "string")
assert.equal(resolvePattern(faker, "station-{{index}}", {index: 7}), "station-7")
assert.ok(["a", "b", "c"].includes(String(resolvePattern(faker, "{{pick:a|b|c}}"))))
assert.match(String(resolvePattern(faker, "{{color.hex}}")), /^#[0-9a-f]{6}$/)
assert.ok(validatePattern(faker, "{{person.fullNam}}")?.includes("Unknown path"))

// Money and coordinates must be real numbers, not formatted strings.
const typed: [string, string, string][] = [
	["{{number.int:{\"min\":1,\"max\":9}}}", "number", "int"],
	["{{number.float:{\"min\":1,\"max\":9,\"fractionDigits\":2}}}", "number", "float"],
	["{{location.latitude:{\"min\":-90,\"max\":90,\"precision\":4}}}", "number", "latitude"],
	["{{location.longitude:{\"min\":-180,\"max\":180,\"precision\":4}}}", "number", "longitude"],
	["{{commerce.upc}}", "string", "upc"],
	["{{internet.email}}", "string", "email"],
	["{{person.fullName}}", "string", "fullName"],
	["{{date.past}}", "object", "date"],
]
for (const [pattern, expected, label] of typed) {
	const value = resolvePattern(faker, pattern)
	assert.equal(typeof value, expected, `${label} should be ${expected}, got ${typeof value}`)
}
ok("types")

// Same seed → same values, different seed → different values.
const seeded = (seed: number) => {
	const instance = createFaker("en", seed)
	return JSON.stringify([
		resolvePattern(instance, "{{person.fullName}}"),
		resolvePattern(instance, "{{internet.email}}"),
		resolvePattern(instance, "{{string.uuid}}"),
		resolvePattern(instance, '{{number.int:{"min":1,"max":9}}}'),
	])
}
assert.equal(seeded(7), seeded(7))
assert.notEqual(seeded(7), seeded(8))

// Locales really do change the data.
const localized = (locale: string) => {
	const instance = createFaker(locale, 3)
	return JSON.stringify([
		resolvePattern(instance, "{{person.fullName}}"),
		resolvePattern(instance, "{{location.city}}"),
		resolvePattern(instance, "{{company.name}}"),
	])
}
assert.notEqual(localized("id_ID"), localized("en"))
ok("faker")

/* ------------------------------------------------------------------ */
section("form filler recognition")

const describe = (
	partial: Partial<FieldDescriptor> & {tag?: string},
): FieldDescriptor => ({
	tag: "input",
	type: "text",
	name: "",
	id: "",
	placeholder: "",
	autocomplete: "",
	label: "",
	value: "",
	...partial,
})

const cases: [string, FieldDescriptor, string][] = [
	["autocomplete email", describe({type: "email", autocomplete: "email"}), "email"],
	["autocomplete cc-csc", describe({name: "x", autocomplete: "cc-csc"}), "cvv"],
	["autocomplete address-line2", describe({autocomplete: "address-line-2".replace("-2", "2")}), "address2"],
	["type search", describe({type: "search", name: "q"}), "search"],
	["id search-field", describe({id: "search-field"}), "search"],
	["indonesian phone", describe({name: "no_hp", placeholder: "Nomor HP"}), "tel"],
	["indonesian address", describe({label: "Alamat lengkap"}), "address"],
	["english zip", describe({name: "postal_code"}), "zip"],
	["first name", describe({name: "fname"}), "firstname"],
	["last name", describe({name: "surname"}), "lastname"],
	["full name label", describe({label: "Your name"}), "fullname"],
	["company", describe({name: "organization"}), "company"],
	["cvv keyword", describe({placeholder: "CVC"}), "cvv"],
	["expiry keyword", describe({name: "card_expiry"}), "expiry"],
	["number input", describe({type: "number", name: "amount"}), "price"],
	["plain number", describe({type: "number", name: "field_x"}), "number"],
	["date input", describe({type: "date"}), "date"],
	["textarea", describe({tag: "textarea", name: "feedback"}), "message"],
	["unknown input", describe({name: "zzz"}), "text"],
	["color input", describe({type: "color"}), "color"],
	["quantity", describe({name: "qty"}), "quantity"],
	["age", describe({name: "user_age"}), "age"],
]

const detectionFailures: string[] = []
for (const [label, descriptor, expected] of cases) {
	const actual = detectFieldKind(descriptor)
	if (actual !== expected) detectionFailures.push(`${label}: expected ${expected}, got ${actual}`)
}
assert.deepEqual(detectionFailures, [], `detection failed:\n${detectionFailures.join("\n")}`)

// Overrides win over defaults.
const overridden = patternForKind("city", {overrides: {city: "{{location.country}}"}})
assert.equal(overridden, "{{location.country}}")
assert.equal(patternForKind("city", {overrides: {}}), KIND_PATTERNS.city)
assert.equal(DEFAULT_CONFIG.onlyEmpty, true)
assert.equal(DEFAULT_CONFIG.shiftFillsForm, true)
ok("recognition")

console.log(`\n✓ ${checks} check groups passed — all assertions green`)
