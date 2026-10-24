/**
 * Barcode & QR engine for SideDevTools.
 *
 * Reading leans on the native `BarcodeDetector` (Chrome ships QR, Data Matrix,
 * Aztec, PDF417, Code 128/39/93, Codabar, EAN/UPC and ITF) with jsQR as an
 * offline fallback for QR codes. Generation uses `qrcode` — pure client-side.
 */

import jsQR from "jsqr"
import QRCode from "qrcode"

export const READ_FORMATS = [
	"qr_code",
	"aztec",
	"data_matrix",
	"pdf417",
	"code_128",
	"code_39",
	"code_93",
	"codabar",
	"ean_13",
	"ean_8",
	"itf",
	"upc_a",
	"upc_e",
] as const

export type ReadFormat = (typeof READ_FORMATS)[number]

export const FORMAT_LABELS: Record<string, string> = {
	qr_code: "QR Code",
	aztec: "Aztec",
	data_matrix: "Data Matrix",
	pdf417: "PDF417",
	code_128: "Code 128",
	code_39: "Code 39",
	code_93: "Code 93",
	codabar: "Codabar",
	ean_13: "EAN-13",
	ean_8: "EAN-8",
	itf: "ITF",
	upc_a: "UPC-A",
	upc_e: "UPC-E",
	unknown: "Barcode",
}

export interface BarcodeHit {
	rawValue: string
	format: string
	formatLabel: string
}

interface DetectedBarcode {
	rawValue?: string
	format?: string
}

interface BarcodeDetectorLike {
	detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}

type BarcodeDetectorCtor = new (options?: {formats?: string[]}) => BarcodeDetectorLike

function detectorCtor(): BarcodeDetectorCtor | null {
	if (typeof window === "undefined") return null
	const candidate = (window as unknown as {BarcodeDetector?: unknown})
		.BarcodeDetector
	return typeof candidate === "function"
		? (candidate as BarcodeDetectorCtor)
		: null
}

export function barcodeDetectorAvailable(): boolean {
	return detectorCtor() !== null
}

let supportedCache: Promise<ReadFormat[]> | null = null

/** Which symbologies this browser can actually decode (cached). */
export function supportedReadFormats(): Promise<ReadFormat[]> {
	if (!supportedCache) supportedCache = detectSupportedFormats()
	return supportedCache
}

async function detectSupportedFormats(): Promise<ReadFormat[]> {
	const Ctor = detectorCtor()
	if (!Ctor) return ["qr_code"]
	try {
		const read = (
			Ctor as unknown as {getSupportedFormats?: () => Promise<string[]>}
		).getSupportedFormats
		const list = read ? await read.call(Ctor) : []
		const supported = list.filter((format): format is ReadFormat =>
			(READ_FORMATS as readonly string[]).includes(format),
		)
		return supported.length ? supported : ["qr_code"]
	} catch {
		return ["qr_code"]
	}
}

function labelFor(format: string | undefined): string {
	if (!format) return FORMAT_LABELS.unknown
	return FORMAT_LABELS[format] ?? format
}

/**
 * Decode every barcode found in a canvas. Multiple hits are returned in the
 * detector's order, deduplicated by value.
 */
export async function detectFromCanvas(
	canvas: HTMLCanvasElement,
	formats: readonly ReadFormat[] = READ_FORMATS,
): Promise<BarcodeHit[]> {
	const hits: BarcodeHit[] = []
	const wanted = formats as readonly string[]
	const Ctor = detectorCtor()

	if (Ctor) {
		try {
			// Only ever ask for formats this browser reports support for, so one
			// missing symbology can't make the whole detect() call throw.
			const supported = await supportedReadFormats()
			const effective = wanted.filter((format) =>
				(supported as readonly string[]).includes(format),
			)
			const detector = new Ctor({
				formats: effective.length ? effective : ["qr_code"],
			})
			const found = await detector.detect(canvas)
			for (const barcode of found) {
				if (!barcode.rawValue) continue
				const format = barcode.format ?? "unknown"
				if (hits.some((hit) => hit.rawValue === barcode.rawValue)) continue
				hits.push({
					rawValue: barcode.rawValue,
					format,
					formatLabel: labelFor(format),
				})
			}
		} catch {
			// Fall through to jsQR.
		}
	}

	if (
		wanted.includes("qr_code") &&
		!hits.some((hit) => hit.format === "qr_code")
	) {
		const context = canvas.getContext("2d", {willReadFrequently: true})
		if (context) {
			const data = context.getImageData(0, 0, canvas.width, canvas.height)
			const code = jsQR(data.data, data.width, data.height, {
				inversionAttempts: "attemptBoth",
			})
			if (code?.data && !hits.some((hit) => hit.rawValue === code.data)) {
				hits.push({
					rawValue: code.data,
					format: "qr_code",
					formatLabel: FORMAT_LABELS.qr_code,
				})
			}
		}
	}

	return hits
}

/** Load any image source into a canvas at its natural resolution. */
export function imageToCanvas(
	source: HTMLImageElement | HTMLCanvasElement,
): HTMLCanvasElement {
	const canvas = document.createElement("canvas")
	canvas.width =
		source instanceof HTMLImageElement
			? source.naturalWidth || source.width
			: source.width
	canvas.height =
		source instanceof HTMLImageElement
			? source.naturalHeight || source.height
			: source.height
	const context = canvas.getContext("2d", {willReadFrequently: true})
	if (context) context.drawImage(source, 0, 0, canvas.width, canvas.height)
	return canvas
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image()
		image.onload = () => resolve(image)
		image.onerror = () => reject(new Error("Could not read that image"))
		image.src = src
	})
}

/** Decode every barcode in a data URL (from a capture, drop or paste). */
export async function readBarcodesFromDataUrl(
	dataUrl: string,
	formats: readonly ReadFormat[] = READ_FORMATS,
): Promise<BarcodeHit[]> {
	const image = await loadImage(dataUrl)
	return detectFromCanvas(imageToCanvas(image), formats)
}

/** Decode every barcode in a Blob or File. */
export async function readBarcodesFromBlob(
	blob: Blob,
	formats: readonly ReadFormat[] = READ_FORMATS,
): Promise<BarcodeHit[]> {
	const url = URL.createObjectURL(blob)
	try {
		return await readBarcodesFromDataUrl(url, formats)
	} finally {
		URL.revokeObjectURL(url)
	}
}

/* ------------------------------------------------------------------ */
/* QR generation                                                       */
/* ------------------------------------------------------------------ */

export type ErrorCorrection = "L" | "M" | "Q" | "H"

export interface QrStyle {
	/** Rendered size in pixels. */
	size: number
	/** Quiet-zone width in modules. */
	margin: number
	errorCorrection: ErrorCorrection
	dark: string
	light: string
}

export const DEFAULT_QR_STYLE: QrStyle = {
	size: 512,
	margin: 2,
	errorCorrection: "M",
	dark: "#0b0c0e",
	light: "#ffffff",
}

export function renderQrDataUrl(text: string, style: QrStyle): Promise<string> {
	return QRCode.toDataURL(text, {
		width: style.size,
		margin: style.margin,
		errorCorrectionLevel: style.errorCorrection,
		color: {dark: style.dark, light: style.light},
	})
}

export function renderQrSvg(text: string, style: QrStyle): Promise<string> {
	return QRCode.toString(text, {
		type: "svg",
		margin: style.margin,
		errorCorrectionLevel: style.errorCorrection,
		color: {dark: style.dark, light: style.light},
	})
}
