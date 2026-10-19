/**
 * Helper to encode PNG canvas buffers into a valid multi-image .ico format
 * Structure of standard Windows ICO file:
 * - ICONDIR header (6 bytes)
 * - ICONDIRENTRY array (16 bytes per image)
 * - Image data buffers (PNG formatted bytes)
 */
export async function createIcoFromCanvases(canvases: HTMLCanvasElement[]): Promise<Blob> {
	const pngBlobs: Blob[] = await Promise.all(
		canvases.map(
			(canvas) =>
				new Promise<Blob>((resolve, reject) => {
					canvas.toBlob((blob) => {
						if (blob) resolve(blob)
						else reject(new Error("Failed to export canvas to PNG"))
					}, "image/png")
				}),
		),
	)

	const pngBuffers = await Promise.all(
		pngBlobs.map((blob) => blob.arrayBuffer()),
	)

	const count = pngBuffers.length
	const headerSize = 6
	const entrySize = 16
	const dirSize = headerSize + count * entrySize

	let totalSize = dirSize
	for (const buf of pngBuffers) {
		totalSize += buf.byteLength
	}

	const icoBuffer = new ArrayBuffer(totalSize)
	const view = new DataView(icoBuffer)

	// ICONDIR Header
	view.setUint16(0, 0, true) // Reserved, must be 0
	view.setUint16(2, 1, true) // 1 = ICO file (2 = CUR)
	view.setUint16(4, count, true) // Number of images

	let offset = dirSize
	for (let i = 0; i < count; i++) {
		const canvas = canvases[i]
		const buf = pngBuffers[i]
		const width = canvas.width >= 256 ? 0 : canvas.width
		const height = canvas.height >= 256 ? 0 : canvas.height

		const entryOffset = headerSize + i * entrySize
		view.setUint8(entryOffset + 0, width)
		view.setUint8(entryOffset + 1, height)
		view.setUint8(entryOffset + 2, 0) // Color palette (0 = no palette)
		view.setUint8(entryOffset + 3, 0) // Reserved
		view.setUint16(entryOffset + 4, 1, true) // Color planes (1)
		view.setUint16(entryOffset + 6, 32, true) // Bits per pixel (32 for RGBA PNG)
		view.setUint32(entryOffset + 8, buf.byteLength, true) // Size of image data
		view.setUint32(entryOffset + 12, offset, true) // Offset of image data

		// Copy PNG buffer
		new Uint8Array(icoBuffer, offset, buf.byteLength).set(
			new Uint8Array(buf),
		)
		offset += buf.byteLength
	}

	return new Blob([icoBuffer], {type: "image/x-icon"})
}

export interface FaviconPreset {
	name: string
	filename: string
	width: number
	height: number
	format: "png" | "ico"
	description: string
	recommendedFor: string
}

export const FAVICON_PRESETS: FaviconPreset[] = [
	{
		name: "Multi-Resolution Favicon",
		filename: "favicon.ico",
		width: 48,
		height: 48,
		format: "ico",
		description: "Standard multi-size Windows icon bundle (16, 32, 48px)",
		recommendedFor: "All modern & legacy web browsers",
	},
	{
		name: "Favicon 16x16",
		filename: "favicon-16x16.png",
		width: 16,
		height: 16,
		format: "png",
		description: "Browser tab icon for standard displays",
		recommendedFor: "HTML header standard",
	},
	{
		name: "Favicon 32x32",
		filename: "favicon-32x32.png",
		width: 32,
		height: 32,
		format: "png",
		description: "Browser tab icon for Retina / high-DPI displays",
		recommendedFor: "HTML header standard (Retina)",
	},
	{
		name: "Apple Touch Icon",
		filename: "apple-touch-icon.png",
		width: 180,
		height: 180,
		format: "png",
		description: "iOS home screen bookmark icon",
		recommendedFor: "Apple iOS / iPadOS Safari bookmarks",
	},
	{
		name: "Android Chrome 192x192",
		filename: "android-chrome-192x192.png",
		width: 192,
		height: 192,
		format: "png",
		description: "Web app manifest icon for mobile screens",
		recommendedFor: "PWA manifest / Android homescreen",
	},
	{
		name: "Android Chrome 512x512",
		filename: "android-chrome-512x512.png",
		width: 512,
		height: 512,
		format: "png",
		description: "High-resolution PWA splash screen icon",
		recommendedFor: "PWA splash screen / store listings",
	},
]

export function generateHtmlSnippet(appName: string = "My App"): string {
	return `<!-- Standard Favicon -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">

<!-- Apple Touch Icon (iOS) -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

<!-- Web App Manifest (Android / PWA) -->
<link rel="manifest" href="/site.webmanifest">
<meta name="apple-mobile-web-app-title" content="${appName}">`
}

export function generateWebManifest(appName: string = "My App"): string {
	return JSON.stringify(
		{
			name: appName,
			short_name: appName,
			icons: [
				{
					src: "/android-chrome-192x192.png",
					sizes: "192x192",
					type: "image/png",
				},
				{
					src: "/android-chrome-512x512.png",
					sizes: "512x512",
					type: "image/png",
				},
			],
			theme_color: "#ffffff",
			background_color: "#ffffff",
			display: "standalone",
		},
		null,
		2,
	)
}
