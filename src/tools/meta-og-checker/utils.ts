export interface MetaData {
	title: string
	description: string
	canonicalUrl: string
	faviconUrl: string
	keywords: string
	author: string
	themeColor: string
	viewport: string
	robots: string

	// OpenGraph
	ogTitle: string
	ogDescription: string
	ogImage: string
	ogUrl: string
	ogType: string
	ogSiteName: string

	// Twitter Card
	twitterCard: string
	twitterSite: string
	twitterCreator: string
	twitterTitle: string
	twitterDescription: string
	twitterImage: string
}

export const DEFAULT_META_DATA: MetaData = {
	title: "",
	description: "",
	canonicalUrl: "",
	faviconUrl: "",
	keywords: "",
	author: "",
	themeColor: "#000000",
	viewport: "width=device-width, initial-scale=1.0",
	robots: "index, follow",

	ogTitle: "",
	ogDescription: "",
	ogImage: "",
	ogUrl: "",
	ogType: "website",
	ogSiteName: "",

	twitterCard: "summary_large_image",
	twitterSite: "",
	twitterCreator: "",
	twitterTitle: "",
	twitterDescription: "",
	twitterImage: "",
}

/**
 * Script injected into active browser tab to pull current DOM meta tags
 */
export function extractPageMeta(): MetaData {
	const getMeta = (selector: string): string => {
		const el = document.querySelector(selector)
		return el ? el.getAttribute("content") || "" : ""
	}

	const getLink = (rel: string): string => {
		const el = document.querySelector(`link[rel*='${rel}']`)
		return el ? el.getAttribute("href") || "" : ""
	}

	const title =
		document.title ||
		getMeta("meta[property='og:title']") ||
		getMeta("meta[name='twitter:title']")

	const description =
		getMeta("meta[name='description']") ||
		getMeta("meta[property='og:description']") ||
		getMeta("meta[name='twitter:description']")

	const canonical = getLink("canonical") || window.location.href

	let favicon =
		getLink("icon") ||
		getLink("shortcut icon") ||
		getLink("apple-touch-icon") ||
		"/favicon.ico"

	if (favicon && !favicon.startsWith("http") && !favicon.startsWith("data:")) {
		try {
			favicon = new URL(favicon, window.location.origin).href
		} catch {}
	}

	const ogImageRaw =
		getMeta("meta[property='og:image']") ||
		getMeta("meta[name='twitter:image']")
	let ogImage = ogImageRaw
	if (ogImage && !ogImage.startsWith("http") && !ogImage.startsWith("data:")) {
		try {
			ogImage = new URL(ogImage, window.location.origin).href
		} catch {}
	}

	return {
		title: title.trim(),
		description: description.trim(),
		canonicalUrl: canonical.trim(),
		faviconUrl: favicon,
		keywords: getMeta("meta[name='keywords']").trim(),
		author: getMeta("meta[name='author']").trim(),
		themeColor: getMeta("meta[name='theme-color']").trim() || "#000000",
		viewport:
			getMeta("meta[name='viewport']").trim() ||
			"width=device-width, initial-scale=1.0",
		robots: getMeta("meta[name='robots']").trim() || "index, follow",

		ogTitle: getMeta("meta[property='og:title']").trim() || title.trim(),
		ogDescription:
			getMeta("meta[property='og:description']").trim() || description.trim(),
		ogImage: ogImage.trim(),
		ogUrl: getMeta("meta[property='og:url']").trim() || canonical.trim(),
		ogType: getMeta("meta[property='og:type']").trim() || "website",
		ogSiteName: getMeta("meta[property='og:site_name']").trim(),

		twitterCard:
			getMeta("meta[name='twitter:card']").trim() || "summary_large_image",
		twitterSite: getMeta("meta[name='twitter:site']").trim(),
		twitterCreator: getMeta("meta[name='twitter:creator']").trim(),
		twitterTitle:
			getMeta("meta[name='twitter:title']").trim() || title.trim(),
		twitterDescription:
			getMeta("meta[name='twitter:description']").trim() ||
			description.trim(),
		twitterImage:
			getMeta("meta[name='twitter:image']").trim() || ogImage.trim(),
	}
}

/**
 * Generate formatted HTML tags string from MetaData object
 */
export function generateMetaHtml(data: MetaData): string {
	const lines: string[] = []

	// Primary Meta
	lines.push(`<!-- Primary Meta Tags -->`)
	if (data.title) lines.push(`<title>${escapeHtml(data.title)}</title>`)
	if (data.title)
		lines.push(`<meta name="title" content="${escapeHtml(data.title)}">`)
	if (data.description)
		lines.push(
			`<meta name="description" content="${escapeHtml(data.description)}">`,
		)
	if (data.keywords)
		lines.push(
			`<meta name="keywords" content="${escapeHtml(data.keywords)}">`,
		)
	if (data.author)
		lines.push(`<meta name="author" content="${escapeHtml(data.author)}">`)
	if (data.robots)
		lines.push(`<meta name="robots" content="${escapeHtml(data.robots)}">`)
	if (data.viewport)
		lines.push(
			`<meta name="viewport" content="${escapeHtml(data.viewport)}">`,
		)
	if (data.themeColor)
		lines.push(
			`<meta name="theme-color" content="${escapeHtml(data.themeColor)}">`,
		)
	if (data.canonicalUrl)
		lines.push(`<link rel="canonical" href="${data.canonicalUrl}">`)

	// Open Graph / Facebook
	lines.push(`\n<!-- Open Graph / Facebook -->`)
	lines.push(
		`<meta property="og:type" content="${escapeHtml(data.ogType || "website")}">`,
	)
	if (data.ogUrl || data.canonicalUrl)
		lines.push(
			`<meta property="og:url" content="${escapeHtml(data.ogUrl || data.canonicalUrl)}">`,
		)
	if (data.ogTitle || data.title)
		lines.push(
			`<meta property="og:title" content="${escapeHtml(data.ogTitle || data.title)}">`,
		)
	if (data.ogDescription || data.description)
		lines.push(
			`<meta property="og:description" content="${escapeHtml(data.ogDescription || data.description)}">`,
		)
	if (data.ogImage)
		lines.push(
			`<meta property="og:image" content="${escapeHtml(data.ogImage)}">`,
		)
	if (data.ogSiteName)
		lines.push(
			`<meta property="og:site_name" content="${escapeHtml(data.ogSiteName)}">`,
		)

	// Twitter
	lines.push(`\n<!-- Twitter -->`)
	lines.push(
		`<meta property="twitter:card" content="${escapeHtml(data.twitterCard || "summary_large_image")}">`,
	)
	if (data.twitterSite)
		lines.push(
			`<meta property="twitter:site" content="${escapeHtml(data.twitterSite)}">`,
		)
	if (data.twitterCreator)
		lines.push(
			`<meta property="twitter:creator" content="${escapeHtml(data.twitterCreator)}">`,
		)
	if (data.ogUrl || data.canonicalUrl)
		lines.push(
			`<meta property="twitter:url" content="${escapeHtml(data.ogUrl || data.canonicalUrl)}">`,
		)
	if (data.twitterTitle || data.title)
		lines.push(
			`<meta property="twitter:title" content="${escapeHtml(data.twitterTitle || data.title)}">`,
		)
	if (data.twitterDescription || data.description)
		lines.push(
			`<meta property="twitter:description" content="${escapeHtml(data.twitterDescription || data.description)}">`,
		)
	if (data.twitterImage || data.ogImage)
		lines.push(
			`<meta property="twitter:image" content="${escapeHtml(data.twitterImage || data.ogImage)}">`,
		)

	return lines.join("\n")
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
}
