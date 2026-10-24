/**
 * Color Toolkit engine — pure, dependency-free color math.
 * Everything runs client-side: parsing, conversions, ramps, contrast (WCAG + APCA)
 * and perceptual palette extraction (k-means over OKLab).
 */

export interface RGBA {
	r: number // 0-255
	g: number // 0-255
	b: number // 0-255
	a: number // 0-1
}

export interface ChannelValues {
	hex: string
	hexAlpha: string
	rgb: string
	hsl: string
	hsv: string
	oklch: string
	oklab: string
	luminance: number
}

/* ------------------------------------------------------------------ */
/* Named colors (CSS Color Module Level 4)                            */
/* ------------------------------------------------------------------ */

const NAMED_RAW =
	"aliceblue=f0f8ff,antiquewhite=faebd7,aqua=00ffff,aquamarine=7fffd4,azure=f0ffff,beige=f5f5dc,bisque=ffe4c4,black=000000,blanchedalmond=ffebcd,blue=0000ff,blueviolet=8a2be2,brown=a52a2a,burlywood=deb887,cadetblue=5f9ea0,chartreuse=7fff00,chocolate=d2691e,coral=ff7f50,cornflowerblue=6495ed,cornsilk=fff8dc,crimson=dc143c,cyan=00ffff,darkblue=00008b,darkcyan=008b8b,darkgoldenrod=b8860b,darkgray=a9a9a9,darkgreen=006400,darkgrey=a9a9a9,darkkhaki=bdb76b,darkmagenta=8b008b,darkolivegreen=556b2f,darkorange=ff8c00,darkorchid=9932cc,darkred=8b0000,darksalmon=e9967a,darkseagreen=8fbc8f,darkslateblue=483d8b,darkslategray=2f4f4f,darkslategrey=2f4f4f,darkturquoise=00ced1,darkviolet=9400d3,deeppink=ff1493,deepskyblue=00bfff,dimgray=696969,dimgrey=696969,dodgerblue=1e90ff,firebrick=b22222,floralwhite=fffaf0,forestgreen=228b22,fuchsia=ff00ff,gainsboro=dcdcdc,ghostwhite=f8f8ff,gold=ffd700,goldenrod=daa520,gray=808080,green=008000,greenyellow=adff2f,grey=808080,honeydew=f0fff0,hotpink=ff69b4,indianred=cd5c5c,indigo=4b0082,ivory=fffff0,khaki=f0e68c,lavender=e6e6fa,lavenderblush=fff0f5,lawngreen=7cfc00,lemonchiffon=fffacd,lightblue=add8e6,lightcoral=f08080,lightcyan=e0ffff,lightgoldenrodyellow=fafad2,lightgray=d3d3d3,lightgreen=90ee90,lightgrey=d3d3d3,lightpink=ffb6c1,lightsalmon=ffa07a,lightseagreen=20b2aa,lightskyblue=87cefa,lightslategray=778899,lightslategrey=778899,lightsteelblue=b0c4de,lightyellow=ffffe0,lime=00ff00,limegreen=32cd32,linen=faf0e6,magenta=ff00ff,maroon=800000,mediumaquamarine=66cdaa,mediumblue=0000cd,mediumorchid=ba55d3,mediumpurple=9370db,mediumseagreen=3cb371,mediumslateblue=7b68ee,mediumspringgreen=00fa9a,mediumturquoise=48d1cc,mediumvioletred=c71585,midnightblue=191970,mintcream=f5fffa,mistyrose=ffe4e1,moccasin=ffe4b5,navajowhite=ffdead,navy=000080,oldlace=fdf5e6,olive=808000,olivedrab=6b8e23,orange=ffa500,orangered=ff4500,orchid=da70d6,palegoldenrod=eee8aa,palegreen=98fb98,paleturquoise=afeeee,palevioletred=db7093,papayawhip=ffefd5,peachpuff=ffdab9,peru=cd853f,pink=ffc0cb,plum=dda0dd,powderblue=b0e0e6,purple=800080,rebeccapurple=663399,red=ff0000,rosybrown=bc8f8f,royalblue=4169e1,saddlebrown=8b4513,salmon=fa8072,sandybrown=f4a460,seagreen=2e8b57,seashell=fff5ee,sienna=a0522d,silver=c0c0c0,skyblue=87ceeb,slateblue=6a5acd,slategray=708090,slategrey=708090,snow=fffafa,springgreen=00ff7f,steelblue=4682b4,tan=d2b48c,teal=008080,thistle=d8bfd8,tomato=ff6347,turquoise=40e0d0,violet=ee82ee,wheat=f5deb3,white=ffffff,whitesmoke=f5f5f5,yellow=ffff00,yellowgreen=9acd32"

export const NAMED_COLORS: Record<string, string> = Object.fromEntries(
	NAMED_RAW.split(",").map((entry) => {
		const [name, hex] = entry.split("=")
		return [name, "#" + hex]
	}),
)

export const NAMED_COLOR_LIST = Object.keys(NAMED_COLORS)

/* ------------------------------------------------------------------ */
/* Tailwind default palette (v3 hex reference) — for nearest-token UX  */
/* ------------------------------------------------------------------ */

const TW_RAW: Record<string, string> = {
	slate: "f8fafc,f1f5f9,e2e8f0,cbd5e1,94a3b8,64748b,475569,334155,1e293b,0f172a,020617",
	gray: "f9fafb,f3f4f6,e5e7eb,d1d5db,9ca3af,6b7280,4b5563,374151,1f2937,111827,030712",
	zinc: "fafafa,f4f4f5,e4e4e7,d4d4d8,a1a1aa,71717a,52525b,3f3f46,27272a,18181b,09090b",
	neutral: "fafafa,f5f5f5,e5e5e5,d4d4d4,a3a3a3,737373,525252,404040,262626,171717,0a0a0a",
	stone: "fafaf9,f5f5f4,e7e5e4,d6d3d1,a8a29e,78716c,57534e,44403c,292524,1c1917,0c0a09",
	red: "fef2f2,fee2e2,fecaca,fca5a5,f87171,ef4444,dc2626,b91c1c,991b1b,7f1d1d,450a0a",
	orange: "fff7ed,ffedd5,fed7aa,fdba74,fb923c,f97316,ea580c,c2410c,9a3412,7c2d12,431407",
	amber: "fffbeb,fef3c7,fde68a,fcd34d,fbbf24,f59e0b,d97706,b45309,92400e,78350f,451a03",
	yellow: "fefce8,fef9c3,fef08a,fde047,facc15,eab308,ca8a04,a16207,854d0e,713f12,422006",
	lime: "f7fee7,ecfccb,d9f99d,bef264,a3e635,84cc16,65a30d,4d7c0f,3f6212,365314,1a2e05",
	green: "f0fdf4,dcfce7,bbf7d0,86efac,4ade80,22c55e,16a34a,15803d,166534,14532d,052e16",
	emerald: "ecfdf5,d1fae5,a7f3d0,6ee7b7,34d399,10b981,059669,047857,065f46,064e3b,022c22",
	teal: "f0fdfa,ccfbf1,99f6e4,5eead4,2dd4bf,14b8a6,0d9488,0f766e,115e59,134e4a,042f2e",
	cyan: "ecfeff,cffafe,a5f3fc,67e8f9,22d3ee,06b6d4,0891b2,0e7490,155e75,164e63,083344",
	sky: "f0f9ff,e0f2fe,bae6fd,7dd3fc,38bdf8,0ea5e9,0284c7,0369a1,075985,0c4a6e,082f49",
	blue: "eff6ff,dbeafe,bfdbfe,93c5fd,60a5fa,3b82f6,2563eb,1d4ed8,1e40af,1e3a8a,172554",
	indigo: "eef2ff,e0e7ff,c7d2fe,a5b4fc,818cf8,6366f1,4f46e5,4338ca,3730a3,312e81,1e1b4b",
	violet: "f5f3ff,ede9fe,ddd6fe,c4b5fd,a78bfa,8b5cf6,7c3aed,6d28d9,5b21b6,4c1d95,2e1065",
	purple: "faf5ff,f3e8ff,e9d5ff,d8b4fe,c084fc,a855f7,9333ea,7e22ce,6b21a8,581c87,3b0764",
	fuchsia: "fdf4ff,fae8ff,f5d0fe,f0abfc,e879f9,d946ef,c026d3,a21caf,86198f,701a75,4a044e",
	pink: "fdf2f8,fce7f3,fbcfe8,f9a8d4,f472b6,ec4899,db2777,be185d,9d174d,831843,500724",
	rose: "fff1f2,ffe4e6,fecdd3,fda4af,fb7185,f43f5e,e11d48,be123c,9f1239,881337,4c0519",
}

const TW_SHADES = [
	50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const

export interface TokenMatch {
	family: string
	shade: number
	hex: string
	distance: number
}

const TW_TOKENS: TokenMatch[] = Object.entries(TW_RAW).flatMap(
	([family, shades]) =>
		shades.split(",").map((hex, i) => ({
			family,
			shade: TW_SHADES[i],
			hex: "#" + hex,
			distance: 0,
		})),
)

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value))
}

function channelFromHex(part: string) {
	return parseInt(part, 16)
}

export function parseColor(input: string): RGBA | null {
	if (!input) return null
	let value = input.trim().toLowerCase()

	// Named color
	if (NAMED_COLORS[value]) value = NAMED_COLORS[value]
	else if (value === "transparent")
		return {r: 0, g: 0, b: 0, a: 0}

	// Hex
	if (value.startsWith("#")) {
		const hex = value.slice(1)
		if (hex.length === 3 || hex.length === 4) {
			return {
				r: channelFromHex(hex[0] + hex[0]),
				g: channelFromHex(hex[1] + hex[1]),
				b: channelFromHex(hex[2] + hex[2]),
				a: hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1,
			}
		}
		if (hex.length === 6 || hex.length === 8) {
			const r = parseInt(hex.slice(0, 2), 16)
			const g = parseInt(hex.slice(2, 4), 16)
			const b = parseInt(hex.slice(4, 6), 16)
			if ([r, g, b].some(Number.isNaN)) return null
			return {
				r,
				g,
				b,
				a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
			}
		}
		return null
	}

	// functional notation: rgb()/rgba()/hsl()/hsla()/hwb()/hsv()/oklch()/lab()
	const match = value.match(/^([a-z]+)\(([^)]+)\)$/)
	if (!match) return null
	const fn = match[1]
	const raw = match[2].replace(/\s*\/\s*/g, " / ")
	let parts: string[] = []
	let alpha = 1

	if (raw.includes("/")) {
		const [body, a] = raw.split("/")
		parts = body.trim().split(/[\s,]+/)
		alpha = parseAlpha(a.trim())
	} else if (fn.startsWith("rgb") && raw.includes(",")) {
		const list = raw.split(",").map((s) => s.trim())
		if (list.length === 4) alpha = parseAlpha(list[3])
		parts = list.slice(0, 3)
	} else if (fn.startsWith("hsl") && raw.includes(",")) {
		const list = raw.split(",").map((s) => s.trim())
		if (list.length === 4) alpha = parseAlpha(list[3])
		parts = list.slice(0, 3)
	} else {
		parts = raw.trim().split(/[\s,]+/)
		if (parts.length === 4) {
			alpha = parseAlpha(parts[3])
			parts = parts.slice(0, 3)
		}
	}

	if (parts.length < 3) return null
	const nums = parts.map(parseChannel)

	if (fn.startsWith("rgb")) {
		return {
			r: clamp(nums[0], 0, 255),
			g: clamp(nums[1], 0, 255),
			b: clamp(nums[2], 0, 255),
			a: alpha,
		}
	}
	if (fn.startsWith("hsl")) {
		const {r, g, b} = hslToRgb(nums[0] / 360, nums[1] / 100, nums[2] / 100)
		return {r, g, b, a: alpha}
	}
	if (fn.startsWith("hsv")) {
		const {r, g, b} = hsvToRgb(nums[0] / 360, nums[1] / 100, nums[2] / 100)
		return {r, g, b, a: alpha}
	}
	if (fn === "oklch") {
		const rgb = oklchToOklab(nums[0] / 100, nums[1], nums[2])
		return {...oklabToRgba(rgb), a: alpha}
	}
	return null
}

function parseChannel(raw: string): number {
	if (raw.endsWith("%")) return (parseFloat(raw) / 100) * 255
	return parseFloat(raw)
}

function parseAlpha(raw: string): number {
	if (raw.endsWith("%")) return clamp(parseFloat(raw) / 100, 0, 1)
	return clamp(parseFloat(raw), 0, 1)
}

/* ------------------------------------------------------------------ */
/* Color space conversions                                             */
/* ------------------------------------------------------------------ */

export function hslToRgb(h: number, s: number, l: number) {
	h = ((h % 1) + 1) % 1
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s
	const p = 2 * l - q
	const hue = (t: number) => {
		if (t < 0) t += 1
		if (t > 1) t -= 1
		if (t < 1 / 6) return p + (q - p) * 6 * t
		if (t < 1 / 2) return q
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
		return p
	}
	return {
		r: Math.round(hue(h + 1 / 3) * 255),
		g: Math.round(hue(h) * 255),
		b: Math.round(hue(h - 1 / 3) * 255),
	}
}

export function hsvToRgb(h: number, s: number, v: number) {
	h = ((h % 1) + 1) % 1
	const i = Math.floor(h * 6)
	const f = h * 6 - i
	const p = v * (1 - s)
	const q = v * (1 - f * s)
	const t = v * (1 - (1 - f) * s)
	const mod = i % 6
	const map: [number, number, number][] = [
		[v, t, p],
		[q, v, p],
		[p, v, t],
		[p, q, v],
		[t, p, v],
		[v, p, q],
	]
	const [r, g, b] = map[mod]
	return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255)}
}

export function rgbToHsl(c: RGBA) {
	const r = c.r / 255
	const g = c.g / 255
	const b = c.b / 255
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	const l = (max + min) / 2
	let h = 0
	let s = 0
	if (max !== min) {
		const d = max - min
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
		if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
		else if (max === g) h = (b - r) / d + 2
		else h = (r - g) / d + 4
		h /= 6
	}
	return {h: h * 360, s: s * 100, l: l * 100}
}

export function rgbToHsv(c: RGBA) {
	const r = c.r / 255
	const g = c.g / 255
	const b = c.b / 255
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	const d = max - min
	let h = 0
	if (d !== 0) {
		if (max === r) h = ((g - b) / d) % 6
		else if (max === g) h = (b - r) / d + 2
		else h = (r - g) / d + 4
		h *= 60
		if (h < 0) h += 360
	}
	return {h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100}
}

function srgbToLinear(v: number) {
	const n = v / 255
	return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
}

function linearToSrgb(v: number) {
	const n = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
	return clamp(Math.round(n * 255), 0, 255)
}

export interface OKLab {
	L: number
	a: number
	b: number
}

export interface OKLCH {
	L: number
	C: number
	H: number
}

export function rgbaToOklab(c: RGBA): OKLab {
	const r = srgbToLinear(c.r)
	const g = srgbToLinear(c.g)
	const b = srgbToLinear(c.b)

	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

	return {
		L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	}
}

export function oklabToRgba(lab: OKLab): RGBA {
	const {L, a, b} = lab
	const l_ = L + 0.3963377774 * a + 0.2158037573 * b
	const m_ = L - 0.1055613458 * a - 0.0638541728 * b
	const s_ = L - 0.0894841775 * a - 1.291485548 * b

	const l = l_ * l_ * l_
	const m = m_ * m_ * m_
	const s = s_ * s_ * s_

	return {
		r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
		a: 1,
	}
}

export function rgbaToOklch(c: RGBA): OKLCH {
	const lab = rgbaToOklab(c)
	const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b)
	let H = (Math.atan2(lab.b, lab.a) * 180) / Math.PI
	if (H < 0) H += 360
	return {L: lab.L, C, H}
}

export function oklchToOklab(L: number, C: number, H: number): OKLab {
	const rad = (H * Math.PI) / 180
	return {L, a: C * Math.cos(rad), b: C * Math.sin(rad)}
}

/** Whether an OKLCH triple is representable in sRGB without clipping. */
function inGamut(L: number, C: number, H: number) {
	const rgb = oklabToRgba(oklchToOklab(L, C, H))
	// Round-trip: if conversion clipped, the reverse L/C/H drifts noticeably.
	const back = rgbaToOklch(rgb)
	return Math.abs(back.C - C) < 0.002
}

/** Gamut-map an OKLCH color into sRGB by reducing chroma. */
export function oklchToRgbaSafe(L: number, C: number, H: number): RGBA {
	let chroma = clamp(C, 0, 0.4)
	if (!inGamut(L, chroma, H)) {
		let lo = 0
		let hi = chroma
		for (let i = 0; i < 24; i++) {
			const mid = (lo + hi) / 2
			if (inGamut(L, mid, H)) lo = mid
			else hi = mid
		}
		chroma = lo
	}
	return oklabToRgba(oklchToOklab(clamp(L, 0, 1), chroma, H))
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function toHex(c: RGBA, withAlpha = false): string {
	const hex = (v: number) => v.toString(16).padStart(2, "0")
	const base = `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`
	if (!withAlpha || c.a >= 1) return base
	return base + hex(Math.round(c.a * 255))
}

function round(value: number, digits: number) {
	const f = Math.pow(10, digits)
	return Math.round(value * f) / f
}

export function describeColor(c: RGBA): ChannelValues {
	const hsl = rgbToHsl(c)
	const hsv = rgbToHsv(c)
	const oklch = rgbaToOklch(c)
	const oklab = rgbaToOklab(c)
	return {
		hex: toHex(c),
		hexAlpha: toHex(c, true),
		rgb:
			c.a >= 1
				? `rgb(${c.r} ${c.g} ${c.b})`
				: `rgb(${c.r} ${c.g} ${c.b} / ${round(c.a, 3)})`,
		hsl: `hsl(${round(hsl.h, 1)} ${round(hsl.s, 1)}% ${round(hsl.l, 1)}%)`,
		hsv: `hsv(${round(hsv.h, 1)} ${round(hsv.s, 1)}% ${round(hsv.v, 1)}%)`,
		oklch: `oklch(${round(oklch.L * 100, 1)}% ${round(oklch.C, 4)} ${round(oklch.H, 1)})`,
		oklab: `oklab(${round(oklab.L * 100, 1)}% ${round(oklab.a, 4)} ${round(oklab.b, 4)})`,
		luminance: round(relativeLuminance(c), 4),
	}
}

/* ------------------------------------------------------------------ */
/* Contrast — WCAG 2.2 + APCA (W3 0.1.9)                               */
/* ------------------------------------------------------------------ */

export function relativeLuminance(c: RGBA) {
	const r = srgbToLinear(c.r)
	const g = srgbToLinear(c.g)
	const b = srgbToLinear(c.b)
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: RGBA, b: RGBA) {
	const la = relativeLuminance(a)
	const lb = relativeLuminance(b)
	const lighter = Math.max(la, lb)
	const darker = Math.min(la, lb)
	return (lighter + 0.05) / (darker + 0.05)
}

const APCA = {
	mainTRC: 2.4,
	Rco: 0.2126729,
	Gco: 0.7151522,
	Bco: 0.072175,
	normBG: 0.56,
	normTXT: 0.57,
	revTXT: 0.62,
	revBG: 0.65,
	blkThrs: 0.022,
	blkClmp: 1.414,
	scaleBoW: 1.14,
	scaleWoB: 1.14,
	loBoWoffset: 0.027,
	loWoBoffset: 0.027,
	deltaYmin: 0.0005,
	loClip: 0.1,
}

function apcaLuminance(c: RGBA) {
	const r = Math.pow(c.r / 255, APCA.mainTRC)
	const g = Math.pow(c.g / 255, APCA.mainTRC)
	const b = Math.pow(c.b / 255, APCA.mainTRC)
	const y = APCA.Rco * r + APCA.Gco * g + APCA.Bco * b
	return y > APCA.blkThrs ? y : y + Math.pow(APCA.blkThrs - y, APCA.blkClmp)
}

/** APCA lightness contrast (Lc). Positive = dark text on light bg. */
export function apcaContrast(text: RGBA, background: RGBA): number {
	const ytxt = apcaLuminance(text)
	const ybg = apcaLuminance(background)
	if (Math.abs(ybg - ytxt) < APCA.deltaYmin) return 0

	let out: number
	if (ybg > ytxt) {
		const sapc =
			(Math.pow(ybg, APCA.normBG) - Math.pow(ytxt, APCA.normTXT)) *
			APCA.scaleBoW
		out = sapc < APCA.loClip ? 0 : sapc - APCA.loBoWoffset
	} else {
		const sapc =
			(Math.pow(ybg, APCA.revBG) - Math.pow(ytxt, APCA.revTXT)) *
			APCA.scaleWoB
		out = sapc > -APCA.loClip ? 0 : sapc + APCA.loWoBoffset
	}
	return Math.round(out * 1000) / 10
}

export interface ContrastReport {
	ratio: number
	apca: number
	aaNormal: boolean
	aaLarge: boolean
	aaaNormal: boolean
	aaaLarge: boolean
	uiComponent: boolean
}

export function analyzeContrast(fg: RGBA, bg: RGBA): ContrastReport {
	const ratio = contrastRatio(fg, bg)
	return {
		ratio: Math.round(ratio * 100) / 100,
		apca: apcaContrast(fg, bg),
		aaNormal: ratio >= 4.5,
		aaLarge: ratio >= 3,
		aaaNormal: ratio >= 7,
		aaaLarge: ratio >= 4.5,
		uiComponent: ratio >= 3,
	}
}

/* ------------------------------------------------------------------ */
/* Ramp / scale generation                                             */
/* ------------------------------------------------------------------ */

export interface ScaleStep {
	shade: number
	hex: string
	oklch: string
}

/** Tailwind's default shade ramp, 50 → 950. */
export const RAMP_SHADES = [
	50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const

const SCALE_SHADES: number[] = [...RAMP_SHADES]
const SCALE_LIGHTNESS = [
	0.971, 0.936, 0.885, 0.808, 0.704, 0.606, 0.52, 0.442, 0.372, 0.31, 0.235,
]
const SCALE_CHROMA = [
	0.22, 0.38, 0.58, 0.79, 0.93, 1, 0.98, 0.9, 0.79, 0.68, 0.5,
]

/** Per-ramp tweaks, all optional and neutral by default. */
export interface RampOptions {
	/** Rotate the whole ramp's hue, in degrees (-180 → 180). */
	hueShift?: number
	/** Multiplier on the chroma curve: 1 = balanced, lower = muted. */
	chroma?: number
	/** Lightness bias added to every step (-0.15 → 0.15). */
	lightness?: number
}

export const DEFAULT_RAMP_OPTIONS: Required<RampOptions> = {
	hueShift: 0,
	chroma: 1,
	lightness: 0,
}

function buildStep(
	shade: number,
	L: number,
	chroma: number,
	hue: number,
): ScaleStep {
	const rgba = oklchToRgbaSafe(L, chroma, hue)
	const oklch = rgbaToOklch(rgba)
	return {
		shade,
		hex: toHex(rgba),
		oklch: `oklch(${round(oklch.L * 100, 1)}% ${round(oklch.C, 4)} ${round(oklch.H, 1)})`,
	}
}

/**
 * Build a 50→950 ramp from a single color by pinning the hue and walking
 * OKLCH lightness, so mid tones stay perceptually even. The optional knobs
 * tune hue drift, chroma intensity and lightness without leaving OKLCH.
 */
export function generateScale(
	base: RGBA,
	options: RampOptions = {},
): ScaleStep[] {
	const hueShift = options.hueShift ?? 0
	const chromaScale = options.chroma ?? 1
	const lightnessBias = options.lightness ?? 0
	const {C, H} = rgbaToOklch(base)
	const peakC = clamp(C, 0, 0.32)
	return SCALE_SHADES.map((shade, i) => {
		const L = clamp(SCALE_LIGHTNESS[i] + lightnessBias, 0.055, 0.995)
		const chroma = Math.min(peakC * SCALE_CHROMA[i] * chromaScale, 0.33)
		const hue = (H + hueShift + 360) % 360
		return buildStep(shade, L, chroma, hue)
	})
}

/**
 * A companion near-neutral ramp that shares the base hue and lightness
 * curve — the gray scale Tailwind pairs with a brand color.
 */
export function generateNeutralScale(
	base: RGBA,
	options: RampOptions = {},
): ScaleStep[] {
	const hueShift = options.hueShift ?? 0
	const lightnessBias = options.lightness ?? 0
	const tint = 0.006 * (options.chroma ?? 1)
	const {H} = rgbaToOklch(base)
	return SCALE_SHADES.map((shade, i) => {
		const L = clamp(SCALE_LIGHTNESS[i] + lightnessBias, 0.055, 0.995)
		return buildStep(shade, L, tint, (H + hueShift + 360) % 360)
	})
}

/* ------------------------------------------------------------------ */
/* Tints / shades / harmony                                            */
/* ------------------------------------------------------------------ */

export function mixColors(a: RGBA, b: RGBA, t: number): RGBA {
	return {
		r: Math.round(a.r + (b.r - a.r) * t),
		g: Math.round(a.g + (b.g - a.g) * t),
		b: Math.round(a.b + (b.b - a.b) * t),
		a: a.a + (b.a - a.a) * t,
	}
}

export interface HarmonyColor {
	role: string
	hex: string
}

export function colorHarmony(base: RGBA): HarmonyColor[] {
	const {L, C, H} = rgbaToOklch(base)
	const at = (deg: number) =>
		toHex(oklchToRgbaSafe(L, C, (H + deg + 360) % 360))
	return [
		{role: "Base", hex: toHex(base)},
		{role: "Complement", hex: at(180)},
		{role: "Analogous -30", hex: at(-30)},
		{role: "Analogous +30", hex: at(30)},
		{role: "Triad A", hex: at(120)},
		{role: "Triad B", hex: at(240)},
	]
}

/* ------------------------------------------------------------------ */
/* Nearest token / named color                                         */
/* ------------------------------------------------------------------ */

function oklabDistance(a: OKLab, b: OKLab) {
	return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2)
}

export function nearestNamedColor(target: RGBA): {name: string; hex: string} {
	const lab = rgbaToOklab(target)
	let best = {name: "black", hex: "#000000", distance: Infinity}
	for (const [name, hex] of Object.entries(NAMED_COLORS)) {
		const parsed = parseColor(hex)
		if (!parsed) continue
		const distance = oklabDistance(lab, rgbaToOklab(parsed))
		if (distance < best.distance) best = {name, hex, distance}
	}
	return {name: best.name, hex: best.hex}
}

export function nearestTailwindToken(target: RGBA): TokenMatch {
	const lab = rgbaToOklab(target)
	let best = TW_TOKENS[0]
	let bestDistance = Infinity
	for (const token of TW_TOKENS) {
		const parsed = parseColor(token.hex)
		if (!parsed) continue
		const distance = oklabDistance(lab, rgbaToOklab(parsed))
		if (distance < bestDistance) {
			bestDistance = distance
			best = token
		}
	}
	return {...best, distance: Math.round(bestDistance * 1000) / 1000}
}

/* ------------------------------------------------------------------ */
/* Perceptual palette extraction (k-means in OKLab)                    */
/* ------------------------------------------------------------------ */

export interface ExtractedColor {
	hex: string
	ratio: number
}

interface Sample {
	lab: OKLab
	r: number
	g: number
	b: number
}

function mulberry32(seed: number) {
	return function () {
		seed |= 0
		seed = (seed + 0x6d2b79f5) | 0
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

export function extractPalette(
	data: Uint8ClampedArray,
	count = 6,
	seed = 1337,
	maxSamples = 6000,
): ExtractedColor[] {
	const samples: Sample[] = []
	const totalPixels = data.length / 4
	const stride = Math.max(1, Math.floor(totalPixels / maxSamples))
	for (let i = 0; i < totalPixels; i += stride) {
		const o = i * 4
		if (data[o + 3] < 128) continue // ignore transparent pixels
		const rgba: RGBA = {r: data[o], g: data[o + 1], b: data[o + 2], a: 1}
		samples.push({
			lab: rgbaToOklab(rgba),
			r: rgba.r,
			g: rgba.g,
			b: rgba.b,
		})
	}
	if (samples.length === 0) return []

	const k = clamp(count, 1, Math.min(12, samples.length))
	const random = mulberry32(seed)

	// k-means++ seeding
	const centers: OKLab[] = [samples[Math.floor(random() * samples.length)].lab]
	while (centers.length < k) {
		const distances = samples.map((s) =>
			Math.min(
				...centers.map((c) => oklabDistance(s.lab, c) ** 2),
			),
		)
		const total = distances.reduce((a, b) => a + b, 0)
		if (total === 0) {
			centers.push(samples[Math.floor(random() * samples.length)].lab)
			continue
		}
		let target = random() * total
		let index = 0
		for (let i = 0; i < distances.length; i++) {
			target -= distances[i]
			if (target <= 0) {
				index = i
				break
			}
		}
		centers.push(samples[index].lab)
	}

	let assignment = new Array(samples.length).fill(0)
	for (let iteration = 0; iteration < 14; iteration++) {
		let moved = false
		for (let i = 0; i < samples.length; i++) {
			let bestIndex = 0
			let bestDistance = Infinity
			for (let c = 0; c < centers.length; c++) {
				const d = oklabDistance(samples[i].lab, centers[c])
				if (d < bestDistance) {
					bestDistance = d
					bestIndex = c
				}
			}
			if (assignment[i] !== bestIndex) {
				assignment[i] = bestIndex
				moved = true
			}
		}
		const sums = centers.map(() => ({L: 0, a: 0, b: 0, n: 0}))
		for (let i = 0; i < samples.length; i++) {
			const c = assignment[i]
			sums[c].L += samples[i].lab.L
			sums[c].a += samples[i].lab.a
			sums[c].b += samples[i].lab.b
			sums[c].n++
		}
		for (let c = 0; c < centers.length; c++) {
			if (sums[c].n === 0) continue
			centers[c] = {
				L: sums[c].L / sums[c].n,
				a: sums[c].a / sums[c].n,
				b: sums[c].b / sums[c].n,
			}
		}
		if (!moved && iteration > 2) break
	}

	// Score clusters by share of pixels
	const counts = new Map<string, {count: number; rgba: RGBA}>()
	for (let i = 0; i < samples.length; i++) {
		const center = centers[assignment[i]]
		const rgba = oklabToRgba(center)
		const key = toHex(rgba)
		const entry = counts.get(key)
		if (entry) entry.count++
		else counts.set(key, {count: 1, rgba})
	}

	return [...counts.entries()]
		.map(([hex, {count}]) => ({
			hex,
			ratio: count / samples.length,
		}))
		.sort((a, b) => b.ratio - a.ratio)
}

/* ------------------------------------------------------------------ */
/* Export helpers                                                      */
/* ------------------------------------------------------------------ */

export type CopyFormat =
	| "hex"
	| "rgb"
	| "hsl"
	| "oklch"
	| "css"
	| "tailwind"
	| "json"

export function formatScale(
	steps: ScaleStep[],
	format: CopyFormat,
	name = "brand",
): string {
	switch (format) {
		case "hex":
			return steps.map((s) => s.hex).join("\n")
		case "rgb":
		case "hsl":
		case "oklch": {
			return steps
				.map((s) => {
					const parsed = parseColor(s.hex)
					if (!parsed) return s.hex
					const values = describeColor(parsed)
					return `${s.shade}: ${values[format]}`
				})
				.join("\n")
		}
		case "css":
			return steps
				.map((s) => `\t--color-${name}-${s.shade}: ${s.hex};`)
				.join("\n")
		case "tailwind":
			return steps
				.map((s) => `\t--color-${name}-${s.shade}: ${s.hex};`)
				.join("\n")
		case "json":
			return JSON.stringify(
				Object.fromEntries(steps.map((s) => [s.shade, s.hex])),
				null,
				2,
			)
		default:
			return steps.map((s) => s.hex).join("\n")
	}
}

export function formatPalette(colors: string[], format: CopyFormat): string {
	switch (format) {
		case "css":
			return colors
				.map((hex) => {
					const parsed = parseColor(hex)
					if (!parsed) return `\t--color: ${hex};`
					const hsl = rgbToHsl(parsed)
					return `\t--color-${toHex(parsed).slice(1)}: ${hex}; /* hsl(${round(hsl.h, 0)} ${round(hsl.s, 0)}% ${round(hsl.l, 0)}%) */`
				})
				.join("\n")
		case "json":
			return JSON.stringify(colors, null, 2)
		case "tailwind":
			return colors
				.map((hex, i) => `\t--color-palette-${i + 1}: ${hex};`)
				.join("\n")
		default:
			return colors
				.map((hex) => {
					const parsed = parseColor(hex)
					if (!parsed) return hex
					const values = describeColor(parsed)
					return `${hex}\t${values[format === "hex" ? "rgb" : format]}`
				})
				.join("\n")
	}
}

/* ------------------------------------------------------------------ */
/* Tailwind-first value formatting                                     */
/* ------------------------------------------------------------------ */

/** A single serialized color value. OKLCH is the toolkit default. */
export type OutputFormat = "oklch" | "hex" | "rgb" | "hsl"

export const OUTPUT_FORMATS: {id: OutputFormat; label: string}[] = [
	{id: "oklch", label: "OKLCH"},
	{id: "hex", label: "HEX"},
	{id: "rgb", label: "RGB"},
	{id: "hsl", label: "HSL"},
]

/** Serialize any color (RGBA or a parseable string) in the chosen format. */
export function formatValue(
	input: RGBA | string,
	format: OutputFormat,
): string {
	const rgba = typeof input === "string" ? parseColor(input) : input
	if (!rgba) return typeof input === "string" ? input : ""
	if (format === "hex") return toHex(rgba)
	const values = describeColor(rgba)
	if (format === "oklch") return values.oklch
	return format === "rgb" ? values.rgb : values.hsl
}

function stepValue(step: ScaleStep, format: OutputFormat): string {
	if (format === "hex") return step.hex
	if (format === "oklch") return step.oklch
	return formatValue(step.hex, format)
}

/** Where a ramp gets exported to. */
export type RampTarget = "tailwind" | "css" | "json" | "list"

export const RAMP_TARGETS: {id: RampTarget; label: string}[] = [
	{id: "tailwind", label: "Tailwind @theme"},
	{id: "css", label: "CSS vars"},
	{id: "json", label: "JSON"},
	{id: "list", label: "Value list"},
]

/**
 * Serialize a ramp for the chosen target, always in the chosen value format.
 * `tailwind` and `css` both emit custom properties; the caller wraps them in
 * an `@theme { … }` or `:root { … }` block.
 */
export function formatRamp(
	steps: ScaleStep[],
	target: RampTarget,
	value: OutputFormat = "oklch",
	name = "brand",
): string {
	const rows = steps.map((step) => ({
		shade: step.shade,
		value: stepValue(step, value),
	}))
	switch (target) {
		case "json":
			return JSON.stringify(
				Object.fromEntries(rows.map((row) => [row.shade, row.value])),
				null,
				2,
			)
		case "list":
			return rows.map((row) => row.value).join("\n")
		case "css":
		case "tailwind":
			return rows
				.map((row) => `\t--color-${name}-${row.shade}: ${row.value};`)
				.join("\n")
	}
}

/** A single `@theme`/CSS custom property, e.g. `--color-brand: oklch(…)`. */
export function formatToken(
	hex: string,
	value: OutputFormat = "oklch",
	name = "brand",
): string {
	return `\t--color-${name}: ${formatValue(hex, value)};`
}
