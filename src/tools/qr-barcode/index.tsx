import {useCallback, useEffect, useMemo, useRef, useState} from "react"
import {
	QrCodeIcon,
	MaximizeIcon,
	UploadIcon,
	ClipboardIcon,
	CopyIcon,
	CheckIcon,
	AlertIcon,
	SparklesIcon,
	TrashIcon,
	RefreshIcon,
	DownloadIcon,
	GlobeIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {Input, Textarea} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {Switch} from "@/components/ui/switch"
import {useToast} from "@/components/ui/toast"
import {cn} from "@/lib/utils"
import {captureRegion} from "@/lib/region-capture"
import {
	DEFAULT_QR_STYLE,
	readBarcodesFromBlob,
	readBarcodesFromDataUrl,
	renderQrDataUrl,
	renderQrSvg,
	supportedReadFormats,
} from "@/lib/barcode"
import type {BarcodeHit, ErrorCorrection, QrStyle} from "@/lib/barcode"
import {
	buildPayload,
	CONTENT_KINDS,
	DEFAULT_FIELDS,
	describeScanValue,
	KIND_FIELDS,
} from "./payload"
import type {ContentKind, QrFields} from "./payload"

type Mode = "read" | "generate"

const SIZES = [256, 512, 1024]
const MARGINS = [0, 1, 2, 3, 4, 6]
const ECC_LEVELS: ErrorCorrection[] = ["L", "M", "Q", "H"]

async function copyImage(dataUrl: string): Promise<boolean> {
	try {
		const blob = await (await fetch(dataUrl)).blob()
		const ClipboardItemCtor = (
			window as unknown as {ClipboardItem?: typeof ClipboardItem}
		).ClipboardItem
		if (!navigator.clipboard?.write || !ClipboardItemCtor) return false
		await navigator.clipboard.write([
			new ClipboardItemCtor({"image/png": blob}),
		])
		return true
	} catch {
		return false
	}
}

function download(href: string, filename: string) {
	const anchor = document.createElement("a")
	anchor.href = href
	anchor.download = filename
	document.body.appendChild(anchor)
	anchor.click()
	anchor.remove()
}

export function QrBarcodeView() {
	const [mode, setMode] = useState<Mode>("read")
	const {showToast} = useToast()

	/* ---- Read ---- */
	const [hits, setHits] = useState<BarcodeHit[]>([])
	const [reading, setReading] = useState(false)
	const [dragging, setDragging] = useState(false)
	const [support, setSupport] = useState<string | null>(null)
	const [copiedValue, setCopiedValue] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		let cancelled = false
		void supportedReadFormats().then((formats) => {
			if (cancelled) return
			setSupport(
				formats.length > 1
					? `${formats.length} formats`
					: "QR only",
			)
		})
		return () => {
			cancelled = true
		}
	}, [])

	const applyHits = useCallback(
		(found: BarcodeHit[], source: string) => {
			if (found.length === 0) {
				showToast(`No barcode found in the ${source}`, "error")
				return
			}
			setHits(found)
			showToast(
				found.length === 1
					? `${found[0].formatLabel} decoded`
					: `${found.length} codes decoded`,
				"success",
			)
		},
		[showToast],
	)

	const handleCapture = async () => {
		setReading(true)
		try {
			const region = await captureRegion()
			if (!region) return
			applyHits(await readBarcodesFromDataUrl(region.dataUrl), "selection")
		} catch (error) {
			showToast(
				error instanceof Error ? error.message : "Capture failed",
				"error",
			)
		} finally {
			setReading(false)
		}
	}

	const handleFile = useCallback(
		async (file: File | undefined | null) => {
			if (!file || !file.type.startsWith("image/")) return
			setReading(true)
			try {
				applyHits(await readBarcodesFromBlob(file), "image")
			} catch {
				showToast("Could not read that image", "error")
			} finally {
				setReading(false)
				if (fileInputRef.current) fileInputRef.current.value = ""
			}
		},
		[applyHits, showToast],
	)

	const handleClipboard = async () => {
		setReading(true)
		try {
			if (!navigator.clipboard?.read) {
				showToast("Clipboard read is unavailable — paste with ⌘V", "info")
				return
			}
			const items = await navigator.clipboard.read()
			for (const item of items) {
				const type = item.types.find((t) => t.startsWith("image/"))
				if (!type) continue
				const blob = await item.getType(type)
				applyHits(await readBarcodesFromBlob(blob), "clipboard")
				return
			}
			showToast("No image in the clipboard", "info")
		} catch {
			showToast("Clipboard access is restricted — paste with ⌘V", "info")
		} finally {
			setReading(false)
		}
	}

	// Global paste while the Read tab is open.
	useEffect(() => {
		if (mode !== "read") return
		const onPaste = (event: ClipboardEvent) => {
			const items = event.clipboardData?.items
			if (!items) return
			for (const item of items) {
				if (!item.type.startsWith("image/")) continue
				const file = item.getAsFile()
				if (file) {
					event.preventDefault()
					void handleFile(file)
					return
				}
			}
		}
		window.addEventListener("paste", onPaste)
		return () => window.removeEventListener("paste", onPaste)
	}, [mode, handleFile])

	const copyHit = (hit: BarcodeHit) => {
		navigator.clipboard.writeText(hit.rawValue)
		setCopiedValue(hit.rawValue)
		showToast("Value copied", "success")
		setTimeout(() => setCopiedValue(null), 1200)
	}

	/* ---- Generate ---- */
	const [kind, setKind] = useState<ContentKind>("text")
	const [fields, setFields] = useState<QrFields>(DEFAULT_FIELDS)
	const [style, setStyle] = useState<QrStyle>(DEFAULT_QR_STYLE)
	const [rendered, setRendered] = useState<{text: string; url: string} | null>(
		null,
	)

	const payload = useMemo(() => buildPayload(kind, fields), [kind, fields])

	// Keeps the preview in lock-step with the payload it was rendered from, so a
	// pending render never shows a QR for stale content.
	const preview = rendered && rendered.text === payload.text ? rendered.url : ""

	useEffect(() => {
		if (!payload.text) return
		let cancelled = false
		void renderQrDataUrl(payload.text, style)
			.then((url) => {
				if (!cancelled) setRendered({text: payload.text, url})
			})
			.catch(() => {
				if (!cancelled) setRendered(null)
			})
		return () => {
			cancelled = true
		}
	}, [payload, style])

	const setField = <K extends keyof QrFields>(
		key: K,
		value: QrFields[K],
	) => {
		setFields((prev) => ({...prev, [key]: value}))
	}

	const handleCopyImage = async () => {
		if (!preview) return
		const ok = await copyImage(preview)
		showToast(
			ok ? "QR image copied" : "Image copy blocked — download instead",
			ok ? "success" : "info",
		)
	}

	const handleDownloadPng = () => {
		if (!preview) return
		download(preview, `qr-${kind}.png`)
	}

	const handleDownloadSvg = async () => {
		if (!payload.text) return
		try {
			const svg = await renderQrSvg(payload.text, style)
			const url =
				"data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
			download(url, `qr-${kind}.svg`)
		} catch {
			showToast("Could not render the SVG", "error")
		}
	}

	return (
		<div
			onDragOver={(e) => {
				if (mode !== "read") return
				e.preventDefault()
				setDragging(true)
			}}
			onDragLeave={(e) => {
				if (e.currentTarget === e.target) setDragging(false)
			}}
			onDrop={(e) => {
				if (mode !== "read") return
				e.preventDefault()
				setDragging(false)
				void handleFile(e.dataTransfer.files?.[0])
			}}
			className={`relative flex-1 flex flex-col gap-3 p-3 transition-colors ${
				dragging ? "bg-[#008060]/5" : ""
			}`}
		>
			{dragging && (
				<div className="absolute inset-2 z-40 rounded-lg border-2 border-dashed border-[#008060] bg-(--p-surface)/95 flex flex-col items-center justify-center p-6 text-center pointer-events-none shadow-xl">
					<UploadIcon size={30} className="text-[#008060] dark:text-[#34d399] mb-2" />
					<p className="text-xs font-semibold text-(--p-text)">
						Drop a QR / barcode image
					</p>
					<p className="text-[10px] text-(--p-text-subdued) mt-0.5">
						Release to decode it instantly
					</p>
				</div>
			)}

			{/* Mode switch */}
			<div className="grid grid-cols-2 gap-1 p-0.5 bg-(--p-surface-subdued) border border-(--p-border) rounded-lg">
				{(
					[
						["read", "Read"],
						["generate", "Generate"],
					] as [Mode, string][]
				).map(([id, label]) => (
					<button
						key={id}
						onClick={() => setMode(id)}
						className={cn(
							"py-1 text-center font-medium uppercase text-[11px] rounded-lg transition-all cursor-pointer",
							mode === id
								? "bg-[#008060]! text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
								: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)",
						)}
					>
						{label}
					</button>
				))}
			</div>

			{mode === "read" ? (
				<div className="flex flex-col gap-3 animate-card-entrance">
					{/* Capture toolbar */}
					<div className="p-2.5 rounded-lg bg-(--p-surface) border border-(--p-border) flex flex-col gap-2">
						<div className="flex items-center justify-between text-[11px] font-semibold text-(--p-text)">
							<span className="flex items-center gap-1.5">
								<QrCodeIcon
									size={15}
									className="text-[#008060] dark:text-[#34d399]"
								/>
								<span>Decode a code</span>
							</span>
							{support && (
								<span className="text-[10px] font-normal text-(--p-text-subdued)">
									{support}
								</span>
							)}
						</div>
						<div className="grid grid-cols-3 gap-1.5">
							<Button
								size="xs"
								onClick={handleCapture}
								disabled={reading}
								className="h-7 text-[11px] justify-center"
								title="Drag a box over part of the page to capture it"
							>
								<MaximizeIcon size={14} />
								<span>{reading ? "Working…" : "Capture"}</span>
							</Button>
							<Button
								variant="secondary"
								size="xs"
								onClick={() => fileInputRef.current?.click()}
								disabled={reading}
								className="h-7 text-[11px] justify-center"
							>
								<UploadIcon size={14} className="text-[#008060] dark:text-[#34d399]" />
								<span>Upload</span>
							</Button>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								onChange={(e) => void handleFile(e.target.files?.[0])}
								className="hidden"
							/>
							<Button
								variant="secondary"
								size="xs"
								onClick={handleClipboard}
								disabled={reading}
								className="h-7 text-[11px] justify-center"
							>
								<ClipboardIcon size={14} className="text-[#008060] dark:text-[#34d399]" />
								<span>Paste</span>
							</Button>
						</div>
						<p className="flex items-center gap-1 text-[9px] text-(--p-text-subdued)">
							<SparklesIcon size={11} />
							<span>
								Captured and decoded entirely on-device. Drop an image
								anywhere here, or press ⌘V.
							</span>
						</p>
					</div>

					{/* Results */}
					{hits.length === 0 ? (
						<div className="flex-1 min-h-[40vh] flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-(--p-border) bg-(--p-surface)/50 my-auto">
							<QrCodeIcon size={26} className="text-(--p-text-subdued) mb-2" />
							<p className="text-xs font-semibold text-(--p-text)">
								Nothing decoded yet
							</p>
							<p className="text-[11px] text-(--p-text-subdued) mt-0.5 max-w-xs">
								Capture a region, upload an image, or paste one — QR,
								Data Matrix, Aztec, PDF417, Code 128/39/93, Codabar and
								EAN/UPC all read.
							</p>
						</div>
					) : (
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between px-0.5">
								<span className="text-[11px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
									Decoded
								</span>
								<Button
									variant="ghost"
									size="xs"
									className="text-(--p-text-subdued) hover:text-[#f87171]"
									onClick={() => setHits([])}
								>
									<TrashIcon size={13} />
									<span>Clear</span>
								</Button>
							</div>
							{hits.map((hit, index) => {
								const hint = describeScanValue(hit.rawValue)
								return (
									<div
										key={`${index}-${hit.rawValue}`}
										className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-(--p-surface) border border-(--p-border) animate-card-entrance"
									>
										<div className="flex items-center gap-1.5">
											<Badge variant="info" className="font-mono">
												{hit.formatLabel}
											</Badge>
											{hint && (
												<Badge variant="secondary">{hint}</Badge>
											)}
											<div className="ml-auto flex items-center gap-1">
												{/^https?:\/\//i.test(hit.rawValue) && (
													<a
														href={hit.rawValue}
														target="_blank"
														rel="noreferrer"
														title="Open link"
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] transition-colors"
													>
														<GlobeIcon size={14} />
													</a>
												)}
												<button
													onClick={() => copyHit(hit)}
													title="Copy value"
													className="p-1 rounded-lg text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] transition-colors cursor-pointer"
												>
													{copiedValue === hit.rawValue ? (
														<CheckIcon
															size={14}
															className="text-[#008060] dark:text-[#34d399]"
														/>
													) : (
														<CopyIcon size={14} />
													)}
												</button>
											</div>
										</div>
										<code className="text-[11px] font-mono text-(--p-text) whitespace-pre-wrap break-all">
											{hit.rawValue}
										</code>
									</div>
								)
							})}
						</div>
					)}
				</div>
			) : (
				<div className="flex flex-col gap-3 animate-card-entrance">
					{/* Content type */}
					<div className="flex flex-col gap-1.5">
						<span className="text-[11px] font-semibold uppercase tracking-wider text-(--p-text-subdued) px-0.5">
							Content
						</span>
						<div className="flex flex-wrap gap-1">
							{CONTENT_KINDS.map((item) => (
								<button
									key={item.id}
									onClick={() => setKind(item.id)}
									className={cn(
										"px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer",
										kind === item.id
											? "bg-[#008060]! text-white border-[#005e46] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
											: "bg-(--p-surface) text-(--p-text-subdued) border-(--p-border) hover:text-(--p-text)",
									)}
								>
									{item.label}
								</button>
							))}
						</div>
					</div>

					{/* Fields */}
					<div className="flex flex-col gap-2 rounded-lg border border-(--p-border) bg-(--p-surface) p-2.5">
						<div className="grid grid-cols-2 gap-2">
								{KIND_FIELDS[kind].map((spec) => (
									<div
										key={spec.key}
										className={cn(
											"flex flex-col gap-1",
											!spec.half && "col-span-2",
										)}
									>
										<span className="text-[10px] text-(--p-text-subdued)">
											{spec.label}
										</span>
										{spec.key === "security" ? (
											<select
												value={fields.security}
												onChange={(e) =>
													setField(
														"security",
														e.target
															.value as QrFields["security"],
													)
												}
												className="h-7 px-2 rounded-lg border border-(--p-border) bg-(--p-surface) text-xs text-(--p-text) focus:outline-none focus:border-[#008060]"
											>
												<option value="WPA">WPA / WPA2</option>
												<option value="WEP">WEP</option>
												<option value="nopass">Open</option>
											</select>
										) : spec.multiline ? (
											<Textarea
												value={String(fields[spec.key])}
												onChange={(e) =>
													setField(spec.key, e.target.value)
												}
												placeholder={spec.placeholder}
												rows={2}
												className="text-[11px]"
											/>
										) : (
											<Input
												value={String(fields[spec.key])}
												onChange={(e) =>
													setField(spec.key, e.target.value)
												}
												placeholder={spec.placeholder}
												className="text-[11px]"
											/>
										)}
									</div>
								))}
							</div>

						{kind === "wifi" && (
							<label className="flex items-center gap-1.5 text-[11px] text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer select-none">
								<Switch
									size="sm"
									checked={fields.hidden}
									onCheckedChange={(v) => setField("hidden", v)}
								/>
								<span>Hidden network</span>
							</label>
						)}
					</div>

					{/* Live preview */}
					<div className="flex flex-col gap-2 rounded-lg border border-(--p-border) bg-(--p-surface) p-2.5">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								Preview
							</span>
							<input
								type="color"
								value={style.dark}
								onChange={(e) =>
									setStyle((s) => ({...s, dark: e.target.value}))
								}
								title="Foreground color"
								className="h-5 w-8 rounded-md border border-(--p-border) cursor-pointer"
							/>
						</div>
						{preview ? (
							<div className="flex justify-center p-2 rounded-lg bg-(--p-canvas) border border-(--p-border)">
								<img
									src={preview}
									alt="QR preview"
									className="w-40 h-40"
									style={{imageRendering: "pixelated"}}
								/>
							</div>
						) : (
							<div className="flex items-center gap-1.5 p-2 rounded-lg bg-[#2d1518] border border-[#522327] text-[#f87171] text-[11px]">
								<AlertIcon size={14} className="shrink-0" />
								<span>{payload.error ?? "Nothing to encode yet."}</span>
							</div>
						)}
						{payload.text && (
							<code className="p-2 rounded-lg bg-(--p-canvas) border border-(--p-border) text-[10px] font-mono text-(--p-text-subdued) whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
								{payload.text}
							</code>
						)}
					</div>

					{/* Style */}
					<div className="grid grid-cols-3 gap-1.5">
						<label className="flex flex-col gap-1">
							<span className="text-[10px] text-(--p-text-subdued)">Size</span>
							<select
								value={style.size}
								onChange={(e) =>
									setStyle((s) => ({
										...s,
										size: Number(e.target.value),
									}))
								}
								className="h-7 px-2 rounded-lg border border-(--p-border) bg-(--p-surface) text-xs text-(--p-text) focus:outline-none focus:border-[#008060]"
							>
								{SIZES.map((size) => (
									<option key={size} value={size}>
										{size}px
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1">
							<span className="text-[10px] text-(--p-text-subdued)">Margin</span>
							<select
								value={style.margin}
								onChange={(e) =>
									setStyle((s) => ({
										...s,
										margin: Number(e.target.value),
									}))
								}
								className="h-7 px-2 rounded-lg border border-(--p-border) bg-(--p-surface) text-xs text-(--p-text) focus:outline-none focus:border-[#008060]"
							>
								{MARGINS.map((margin) => (
									<option key={margin} value={margin}>
										{margin}
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1">
							<span className="text-[10px] text-(--p-text-subdued)">Repair</span>
							<select
								value={style.errorCorrection}
								onChange={(e) =>
									setStyle((s) => ({
										...s,
										errorCorrection: e.target
											.value as ErrorCorrection,
									}))
								}
								className="h-7 px-2 rounded-lg border border-(--p-border) bg-(--p-surface) text-xs text-(--p-text) focus:outline-none focus:border-[#008060]"
							>
								{ECC_LEVELS.map((level) => (
									<option key={level} value={level}>
										Level {level}
									</option>
								))}
							</select>
						</label>
					</div>

					<div className="grid grid-cols-2 gap-1.5">
						<Button
							variant="secondary"
							size="sm"
							disabled={!preview}
							onClick={handleCopyImage}
						>
							<CopyIcon size={14} />
							<span>Copy image</span>
						</Button>
						<Button
							variant="secondary"
							size="sm"
							disabled={!preview}
							onClick={handleDownloadPng}
						>
							<DownloadIcon size={14} />
							<span>PNG</span>
						</Button>
						<Button
							variant="secondary"
							size="sm"
							disabled={!payload.text}
							onClick={handleDownloadSvg}
						>
							<DownloadIcon size={14} />
							<span>SVG</span>
						</Button>
						<Button
							variant="secondary"
							size="sm"
							disabled={!payload.text}
							onClick={() => {
								navigator.clipboard.writeText(payload.text)
								showToast("Payload copied", "success")
							}}
						>
							<CopyIcon size={14} />
							<span>Payload</span>
						</Button>
					</div>

					<Button
						variant="ghost"
						size="xs"
						className="self-start text-(--p-text-subdued)"
						onClick={() => setFields(DEFAULT_FIELDS)}
						title="Reset fields to the sample values"
					>
						<RefreshIcon size={13} />
						<span>Reset sample data</span>
					</Button>
				</div>
			)}

			<div className="flex items-center gap-1.5 text-[9px] text-(--p-text-subdued) pt-1">
				<QrCodeIcon size={12} />
				<span>
					Reading uses Chrome's native BarcodeDetector (jsQR fallback);
					generation runs fully offline.
				</span>
			</div>
		</div>
	)
}
