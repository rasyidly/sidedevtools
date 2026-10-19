/**
 * DateTime Parser and Formatter utilities.
 * Handles parsing arbitrary date/time strings, timestamps, objectIds, and formats them.
 */

export interface FormattedDateItem {
	id: string
	label: string
	value: string
	category: "standard" | "database" | "programmatic" | "spreadsheet"
	description?: string
}

export interface DateMetadata {
	dayOfWeek: string
	dayOfYear: number
	totalDaysInYear: number
	weekNumber: number
	quarter: string
	isLeapYear: boolean
	timezoneOffset: string
	timezoneName: string
	relativeTime: string
}

/**
 * Calculates Excel serial date number (days since Dec 30, 1899, taking into account Lotus 1-2-3 leap year bug).
 */
export function toExcelSerialDate(date: Date): string {
	const excelEpoch = new Date(Date.UTC(1899, 11, 30))
	const msPerDay = 86400000
	const diffDays = (date.getTime() - excelEpoch.getTime()) / msPerDay
	return diffDays.toFixed(6)
}

/**
 * Calculates day of year (1-366).
 */
export function getDayOfYear(date: Date): {dayOfYear: number; totalDays: number; isLeap: boolean} {
	const year = date.getFullYear()
	const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
	const startOfYear = new Date(year, 0, 1)
	const diffMs = date.getTime() - startOfYear.getTime()
	const dayOfYear = Math.floor(diffMs / 86400000) + 1
	return {
		dayOfYear,
		totalDays: isLeap ? 366 : 365,
		isLeap,
	}
}

/**
 * Calculates ISO 8601 week number.
 */
export function getIsoWeekNumber(date: Date): number {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
	const dayNum = d.getUTCDay() || 7
	d.setUTCDate(d.getUTCDate() + 4 - dayNum)
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Relative time description (e.g. "2 hours ago", "in 3 days").
 */
export function getRelativeTime(date: Date): string {
	const now = Date.now()
	const diffMs = date.getTime() - now
	const diffSec = Math.round(diffMs / 1000)
	const rtf = new Intl.RelativeTimeFormat("en", {numeric: "auto"})

	const absSec = Math.abs(diffSec)
	if (absSec < 5) return "just now"
	if (absSec < 60) return rtf.format(diffSec, "second")

	const diffMin = Math.round(diffSec / 60)
	if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute")

	const diffHours = Math.round(diffMin / 60)
	if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour")

	const diffDays = Math.round(diffHours / 24)
	if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day")

	const diffMonths = Math.round(diffDays / 30)
	if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, "month")

	const diffYears = Math.round(diffDays / 365)
	return rtf.format(diffYears, "year")
}

/**
 * Verifies if a Date object is valid and safe to format.
 */
export function isValidDate(d: unknown): d is Date {
	if (!d || !(d instanceof Date)) return false
	const ts = d.getTime()
	if (typeof ts !== "number" || isNaN(ts)) return false
	try {
		d.toISOString()
		return true
	} catch {
		return false
	}
}

/**
 * Robustly parses any date input string.
 */
export function parseAnyDate(input: string): Date | null {
	if (typeof input !== "string") return null
	const trimmed = input.trim()
	if (!trimmed) return null

	try {
		// Preset aliases
		const lower = trimmed.toLowerCase()
		if (lower === "now" || lower === "current") return new Date()
		if (lower === "today") {
			const d = new Date()
			d.setHours(0, 0, 0, 0)
			return d
		}
		if (lower === "yesterday") {
			const d = new Date()
			d.setDate(d.getDate() - 1)
			d.setHours(0, 0, 0, 0)
			return d
		}
		if (lower === "tomorrow") {
			const d = new Date()
			d.setDate(d.getDate() + 1)
			d.setHours(0, 0, 0, 0)
			return d
		}

		// Relative offsets: +1h, -2d, +3w, +30m, etc.
		const relMatch = lower.match(/^([+-]?\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hours?|d|days?|w|weeks?|mo|months?|y|years?)$/)
		if (relMatch) {
			const amount = parseInt(relMatch[1], 10)
			const unit = relMatch[2]
			const d = new Date()
			if (unit.startsWith("s")) d.setSeconds(d.getSeconds() + amount)
			else if (unit.startsWith("m") && !unit.startsWith("mo")) d.setMinutes(d.getMinutes() + amount)
			else if (unit.startsWith("h")) d.setHours(d.getHours() + amount)
			else if (unit.startsWith("d")) d.setDate(d.getDate() + amount)
			else if (unit.startsWith("w")) d.setDate(d.getDate() + amount * 7)
			else if (unit.startsWith("mo")) d.setMonth(d.getMonth() + amount)
			else if (unit.startsWith("y")) d.setFullYear(d.getFullYear() + amount)
			if (isValidDate(d)) return d
			return null
		}

		// MongoDB ObjectId (24 hex characters)
		if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
			const secHex = trimmed.slice(0, 8)
			const unixSec = parseInt(secHex, 16)
			if (!isNaN(unixSec)) {
				const d = new Date(unixSec * 1000)
				if (isValidDate(d)) return d
			}
		}

		// Pure numeric timestamps
		if (/^-?\d+$/.test(trimmed)) {
			const num = Number(trimmed)
			if (isNaN(num)) return null
			const len = trimmed.replace(/^-/, "").length
			let d: Date
			// Nanoseconds (18-19 digits)
			if (len >= 18) d = new Date(Math.floor(num / 1000000))
			// Microseconds (15-17 digits)
			else if (len >= 15) d = new Date(Math.floor(num / 1000))
			// Milliseconds (12-14 digits)
			else if (len >= 12) d = new Date(num)
			// Seconds (<= 11 digits)
			else d = new Date(num * 1000)

			if (isValidDate(d)) return d
			return null
		}

		// DD/MM/YYYY or DD-MM-YYYY (prioritize before generic Date constructor)
		const dmyMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(.*)$/)
		if (dmyMatch) {
			const [, d, m, y, rest] = dmyMatch
			const reformatted = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}${rest ? " " + rest.trim() : ""}`
			const testD = new Date(reformatted)
			if (isValidDate(testD)) return testD
		}

		// SQL timestamp without T: "2026-10-19 14:30:00"
		if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(trimmed)) {
			const isoAdapted = trimmed.replace(/\s+/, "T")
			const d = new Date(isoAdapted)
			if (isValidDate(d)) return d
		}

		// Standard Date.parse / new Date()
		const parsed = new Date(trimmed)
		if (isValidDate(parsed)) return parsed

		return null
	} catch {
		return null
	}
}

/**
 * Formats a Date into all standard formats.
 */
export function formatAllDateVariants(date: Date): FormattedDateItem[] {
	if (!isValidDate(date)) return []
	try {
		const tsMs = date.getTime()
		const tsSec = Math.floor(tsMs / 1000)

	// ISO Strings
	const isoUtc = date.toISOString()
	const tzOffsetMin = -date.getTimezoneOffset()
	const offsetSign = tzOffsetMin >= 0 ? "+" : "-"
	const offsetHours = String(Math.floor(Math.abs(tzOffsetMin) / 60)).padStart(2, "0")
	const offsetMins = String(Math.abs(tzOffsetMin) % 60).padStart(2, "0")
	const offsetStr = `${offsetSign}${offsetHours}:${offsetMins}`

	const pad = (n: number) => String(n).padStart(2, "0")
	const localIso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, "0")}${offsetStr}`

	// SQL
	const sqlDateTime = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`

	// RFC 2822
	const rfc2822 = date.toUTCString()

	// JS Locales
	const localeFull = date.toLocaleString("en-US", {
		dateStyle: "full",
		timeStyle: "long",
	})
	const localeMedium = date.toLocaleString("en-US", {
		dateStyle: "medium",
		timeStyle: "medium",
	})
	const dateOnly = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
	const time24h = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
	const time12h = date.toLocaleTimeString("en-US", {hour12: true})

	// Excel
	const excelSerial = toExcelSerialDate(date)

	// Mongo
	const mongoIso = `ISODate("${isoUtc}")`
	const mongoJson = JSON.stringify({$date: tsMs})

	// Code snippets
	const jsSnippet = `new Date(${tsMs})`
	const pySnippet = `datetime.fromtimestamp(${tsSec}, tz=timezone.utc)`

	return [
		{
			id: "unix-sec",
			label: "Unix Timestamp (Seconds)",
			value: String(tsSec),
			category: "standard",
			description: "Standard epoch seconds",
		},
		{
			id: "unix-ms",
			label: "Unix Timestamp (Milliseconds)",
			value: String(tsMs),
			category: "standard",
			description: "JavaScript / Java epoch milliseconds",
		},
		{
			id: "iso-utc",
			label: "ISO 8601 (UTC / Zulu)",
			value: isoUtc,
			category: "standard",
			description: "Universal standardized UTC timestamp",
		},
		{
			id: "iso-local",
			label: "ISO 8601 (Local Time)",
			value: localIso,
			category: "standard",
			description: "With local timezone offset",
		},
		{
			id: "rfc-2822",
			label: "RFC 2822 / HTTP Date",
			value: rfc2822,
			category: "standard",
			description: "HTTP header & email format",
		},
		{
			id: "locale-full",
			label: "Locale Full String",
			value: localeFull,
			category: "standard",
			description: "Human-readable full date & time",
		},
		{
			id: "locale-medium",
			label: "Locale Date & Time",
			value: localeMedium,
			category: "standard",
			description: "Clean formatted date & time",
		},
		{
			id: "sql-datetime",
			label: "SQL DateTime",
			value: sqlDateTime,
			category: "database",
			description: "MySQL, PostgreSQL, SQLite format",
		},
		{
			id: "mongo-iso",
			label: "MongoDB ISODate",
			value: mongoIso,
			category: "database",
			description: "MongoDB shell query format",
		},
		{
			id: "mongo-json",
			label: "MongoDB Canonical JSON",
			value: mongoJson,
			category: "database",
			description: "BSON / MongoDB driver representation",
		},
		{
			id: "excel-serial",
			label: "Excel Date Serial Number",
			value: excelSerial,
			category: "spreadsheet",
			description: "Days since 1900-01-01 (Excel / Sheets)",
		},
		{
			id: "date-only",
			label: "Date Only (YYYY-MM-DD)",
			value: dateOnly,
			category: "standard",
			description: "Clean ISO date without time",
		},
		{
			id: "time-24h",
			label: "Time Only (24-Hour)",
			value: time24h,
			category: "standard",
			description: "HH:mm:ss 24-hour military format",
		},
		{
			id: "time-12h",
			label: "Time Only (12-Hour)",
			value: time12h,
			category: "standard",
			description: "12-hour AM/PM format",
		},
		{
			id: "js-constructor",
			label: "JavaScript Constructor",
			value: jsSnippet,
			category: "programmatic",
			description: "Ready-to-use JS Date instantiation",
		},
		{
			id: "py-datetime",
			label: "Python datetime",
			value: pySnippet,
			category: "programmatic",
			description: "Python standard library timestamp snippet",
		},
	]
	} catch {
		return []
	}
}

/**
 * Extracts comprehensive calendar and timezone metadata.
 */
export function extractDateMetadata(date: Date): DateMetadata | null {
	if (!isValidDate(date)) return null
	try {
		const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
		const dayOfWeek = days[date.getDay()]
		const {dayOfYear, totalDays, isLeap} = getDayOfYear(date)
		const weekNumber = getIsoWeekNumber(date)
		const month = date.getMonth()
		const quarter = `Q${Math.floor(month / 3) + 1}`

		const tzOffsetMin = -date.getTimezoneOffset()
		const offsetSign = tzOffsetMin >= 0 ? "+" : "-"
		const offsetHours = Math.floor(Math.abs(tzOffsetMin) / 60)
		const offsetMins = Math.abs(tzOffsetMin) % 60
		const offsetStr = `UTC${offsetSign}${offsetHours}${offsetMins ? ":" + String(offsetMins).padStart(2, "0") : ""}`

		let timezoneName = ""
		try {
			timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
		} catch {
			timezoneName = "Local"
		}

		return {
			dayOfWeek,
			dayOfYear,
			totalDaysInYear: totalDays,
			weekNumber,
			quarter,
			isLeapYear: isLeap,
			timezoneOffset: offsetStr,
			timezoneName,
			relativeTime: getRelativeTime(date),
		}
	} catch {
		return null
	}
}
