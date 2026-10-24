/**
 * Regex Playground engine — pattern explanation, match extraction and
 * highlight segmentation. No dependencies, no network, no eval.
 */

export interface ExplainToken {
	text: string
	desc: string
	depth: number
}

export interface MatchGroup {
	index: number
	name?: string
	value: string | undefined
}

export interface RegexMatch {
	index: number
	value: string
	groups: MatchGroup[]
	named: Record<string, string | undefined>
}

export interface MatchResult {
	matches: RegexMatch[]
	error: string | null
	truncated: boolean
}

const MAX_MATCHES = 500

export function runRegex(
	pattern: string,
	flags: string,
	input: string,
): MatchResult {
	const empty: MatchResult = { matches: [], error: null, truncated: false }
	if (!pattern) return empty

	let regex: RegExp
	try {
		regex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g")
	} catch (err) {
		return {
			matches: [],
			error: err instanceof Error ? err.message : String(err),
			truncated: false,
		}
	}

	const matches: RegexMatch[] = []
	let truncated = false
	let lastIndex = -1

	while (true) {
		const match = regex.exec(input)
		if (!match) break
		if (match.index === lastIndex) {
			regex.lastIndex++
			continue
		}
		lastIndex = match.index

		const groups: MatchGroup[] = []
		for (let i = 1; i < match.length; i++) {
			groups.push({ index: i, value: match[i] })
		}
		const named: Record<string, string | undefined> = {}
		if (match.groups) {
			for (const [name, value] of Object.entries(match.groups)) {
				named[name] = value
				const numeric = groups.find((g) => g.value === value)
				if (numeric) numeric.name = name
			}
		}

		matches.push({ index: match.index, value: match[0], groups, named })

		if (matches.length >= MAX_MATCHES) {
			truncated = true
			break
		}
		if (match[0] === "") regex.lastIndex++
	}

	return { matches, error: null, truncated }
}

export interface Segment {
	text: string
	isMatch: boolean
	matchIndex?: number
}

export function buildSegments(text: string, matches: RegexMatch[]): Segment[] {
	if (matches.length === 0) return [{ text, isMatch: false }]
	const segments: Segment[] = []
	let cursor = 0
	for (let i = 0; i < matches.length; i++) {
		const match = matches[i]
		if (match.index > cursor) {
			segments.push({ text: text.slice(cursor, match.index), isMatch: false })
		}
		segments.push({
			text: match.value || "\u200b",
			isMatch: true,
			matchIndex: i,
		})
		cursor = match.index + match.value.length
	}
	if (cursor < text.length) {
		segments.push({ text: text.slice(cursor), isMatch: false })
	}
	return segments
}

/* ------------------------------------------------------------------ */
/* Pattern explanation                                                 */
/* ------------------------------------------------------------------ */

const CLASS_ESCAPES: Record<string, string> = {
	d: "any digit (0-9)",
	D: "any character that is not a digit",
	w: "any word character (a-z, A-Z, 0-9, _)",
	W: "any non-word character",
	s: "any whitespace (space, tab, newline)",
	S: "any non-whitespace character",
	b: "word boundary",
	B: "non-word boundary",
	n: "newline",
	t: "tab",
	r: "carriage return",
	0: "null character",
	v: "vertical tab",
	f: "form feed",
}

function describeQuantifier(q: string): string {
	const lazy = q.endsWith("?") && q.length > 1
	const core = lazy ? q.slice(0, -1) : q
	let base: string
	if (core === "*") base = "zero or more times"
	else if (core === "+") base = "one or more times"
	else if (core === "?") base = "optional"
	else {
		const nums = core.slice(1, -1)
		if (nums.includes(",")) {
			const [min, max] = nums.split(",")
			base = max === "" ? `${min} or more times` : `between ${min} and ${max} times`
		} else base = `exactly ${nums} times`
	}
	return lazy ? `${base} (lazy — as few as possible)` : `${base} (greedy)`
}

const QUANTIFIER_START = /[*+?{]/

/**
 * Turn a regex source into a human-readable, per-token breakdown.
 * Recurses into groups so nested structures stay inspectable.
 */
export function explainRegex(pattern: string): ExplainToken[] {
	const tokens: ExplainToken[] = []
	const stack: { start: number; depth: number }[] = []
	let depth = 0
	let i = 0

	const push = (text: string, desc: string) => {
		tokens.push({ text, desc, depth })
	}

	while (i < pattern.length) {
		const ch = pattern[i]

		// Character class
		if (ch === "[") {
			let raw = "["
			let j = i + 1
			if (pattern[j] === "^") {
				raw += "^"
				j++
			}
			if (pattern[j] === "]") {
				raw += "]"
				j++
			}
			while (j < pattern.length && pattern[j] !== "]") {
				if (pattern[j] === "\\") {
					raw += pattern[j] + (pattern[j + 1] ?? "")
					j += 2
					continue
				}
				raw += pattern[j]
				j++
			}
			raw += "]"
			i = j + 1

			const negated = raw[1] === "^"
			const body = raw.slice(negated ? 2 : 1, -1)
			const parts: string[] = []
			for (let k = 0; k < body.length; k++) {
				const c = body[k]
				if (c === "\\") {
					const esc = body[k + 1] ?? ""
					parts.push(CLASS_ESCAPES[esc] ?? `"${esc}"`)
					k++
					continue
				}
				if (body[k + 1] === "-" && k + 2 < body.length) {
					parts.push(`${c} to ${body[k + 2]}`)
					k += 2
					continue
				}
				parts.push(`"${c}"`)
			}

			push(
				raw,
				`${negated ? "any character except" : "any one of"}: ${parts.join(", ")}`,
			)
			continue
		}

		// Escape sequences
		if (ch === "\\") {
			const next = pattern[i + 1] ?? ""
			const raw = "\\" + next
			if (next === "k" && pattern[i + 2] === "<") {
				const end = pattern.indexOf(">", i)
				const name = pattern.slice(i + 3, end)
				push(pattern.slice(i, end + 1), `same text as the group named "${name}"`)
				i = end + 1
				continue
			}
			if (/[1-9]/.test(next)) {
				push(raw, `same text as capturing group ${next}`)
			} else {
				push(raw, CLASS_ESCAPES[next] ?? `the literal character "${next}"`)
			}
			i += 2
			continue
		}

		// Groups
		if (ch === "(") {
			let raw = "("
			let desc = "start of a capturing group"
			let j = i + 1
			if (pattern.startsWith("?:", i + 1)) {
				raw = "(?:"
				desc = "start of a non-capturing group"
				j = i + 3
			} else if (pattern.startsWith("?=", i + 1)) {
				raw = "(?="
				desc = "lookahead — must be followed by"
				j = i + 3
			} else if (pattern.startsWith("?!", i + 1)) {
				raw = "(?!"
				desc = "negative lookahead — must NOT be followed by"
				j = i + 3
			} else if (pattern.startsWith("?<=", i + 1)) {
				raw = "(?<="
				desc = "lookbehind — must be preceded by"
				j = i + 4
			} else if (pattern.startsWith("?<!", i + 1)) {
				raw = "(?<!"
				desc = "negative lookbehind — must NOT be preceded by"
				j = i + 4
			} else if (pattern.startsWith("?<", i + 1)) {
				const end = pattern.indexOf(">", i)
				const name = pattern.slice(i + 3, end)
				raw = pattern.slice(i, end + 1)
				desc = `start of a capturing group named "${name}"`
				j = end + 1
			}
			push(raw, desc)
			const groupIndex = tokens.length - 1
			stack.push({ start: groupIndex, depth })
			depth++
			i = j
			continue
		}

		if (ch === ")") {
			depth = Math.max(0, depth - 1)
			const opened = stack.pop()
			push(")", opened ? "end of group" : "unmatched closing parenthesis")
			i++
			continue
		}

		// Anchors and dot
		if (ch === "^") {
			push("^", "start of the string (or line with the m flag)")
			i++
			continue
		}
		if (ch === "$") {
			push("$", "end of the string (or line with the m flag)")
			i++
			continue
		}
		if (ch === ".") {
			push(".", "any character except line breaks (unless the s flag is on)")
			i++
			continue
		}
		if (ch === "|") {
			push("|", "alternation — match either the left or the right side")
			i++
			continue
		}

		// Quantifiers
		if (QUANTIFIER_START.test(ch) && tokens.length > 0) {
			let raw = ch
			if (ch === "{") {
				const end = pattern.indexOf("}", i)
				if (end === -1) {
					push(ch, "the literal character \"{\"")
					i++
					continue
				}
				raw = pattern.slice(i, end + 1)
				i = end + 1
			} else {
				i++
			}
			if (pattern[i] === "?") {
				raw += "?"
				i++
			}
			push(raw, `repeat the previous token ${describeQuantifier(raw)}`)
			continue
		}

		// Literal run — merge consecutive plain characters
		let literal = ch
		i++
		while (
			i < pattern.length &&
			!/[\\[\]()^$.|*+?{]/.test(pattern[i])
		) {
			literal += pattern[i]
			i++
		}
		push(literal, `the literal text "${literal}"`)
	}

	return tokens
}

/* ------------------------------------------------------------------ */
/* Pattern library                                                     */
/* ------------------------------------------------------------------ */

export interface PatternPreset {
	name: string
	pattern: string
	flags: string
	sample: string
	note: string
}

export const PATTERN_LIBRARY: PatternPreset[] = [
	{
		name: "Email",
		pattern: "\\b[\\w.+-]+@[\\w-]+\\.[\\w.]{2,}\\b",
		flags: "gi",
		sample: "Ping hello@sidedev.tools — not @nope",
		note: "Practical email matcher, not RFC-perfect",
	},
	{
		name: "URL",
		pattern: "https?:\\/\\/[^\\s\"'<>]+",
		flags: "gi",
		sample: "Docs at https://github.com/rasyidly/sidedevtools and http://localhost:5173",
		note: "Captures links in prose",
	},
	{
		name: "Hex color",
		pattern: "#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\\b",
		flags: "gi",
		sample: "Palette: #008060, #34d399, #fff, #202223cc",
		note: "3, 4, 6 or 8 digit hex",
	},
	{
		name: "Semver",
		pattern: "\\bv?(\\d+)\\.(\\d+)\\.(\\d+)(?:-([\\w.]+))?(?:\\+([\\w.]+))?\\b",
		flags: "g",
		sample: "Releases 1.3.0, v0.0.1-beta.2, 2.10.4+build.7",
		note: "Named groups for major/minor/patch",
	},
	{
		name: "ISO date",
		pattern: "\\b(\\d{4})-(\\d{2})-(\\d{2})(?:[T ](\\d{2}):(\\d{2})(?::(\\d{2}))?)?\\b",
		flags: "g",
		sample: "From 2026-01-04 to 2026-03-19T14:30:00 shipped",
		note: "Date with optional time",
	},
	{
		name: "IPv4",
		pattern: "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b",
		flags: "g",
		sample: "Local 127.0.0.1 and public 203.0.113.42",
		note: "Shape check only",
	},
	{
		name: "Named group demo",
		pattern: "(?<key>[A-Z_]+)=(?<value>[^;]+)",
		flags: "g",
		sample: "MODE=production;REGION=ap-southeast-1;DEBUG=false",
		note: "Named capture groups",
	},
	{
		name: "Slug",
		pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
		flags: "",
		sample: "privacy-first-developer-sidebar",
		note: "kebab-case validation",
	},
]
