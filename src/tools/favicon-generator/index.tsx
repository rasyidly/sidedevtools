import {useState, useRef, useCallback} from "react"
import JSZip from "jszip"
import {
	UploadIcon,
	DownloadIcon,
	CopyIcon,
	CheckIcon,
	RefreshIcon,
	ArchiveIcon,
	CodeIcon,
	ImageIcon,
	ClipboardIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {useToast} from "@/components/ui/toast"
import {
	FAVICON_PRESETS,
	createIcoFromCanvases,
	generateHtmlSnippet,
	generateWebManifest,
} from "./utils"

interface RenderedFavicon {
	filename: string
	name: string
	width: number
	height: number
	format: "png" | "ico"
	dataUrl: string
	previewDataUrl?: string
	blob: Blob
	sizeBytes: number
}

type FaviconTab = "icons" | "code"

export function FaviconGeneratorView() {
	const [imageSrc, setImageSrc] = useState<string | null>(null)
	const [imageName, setImageName] = useState<string>("")
	const [appName, setAppName] = useState<string>("My Web App")
	const [renderedIcons, setRenderedIcons] = useState<RenderedFavicon[]>([])
	const [isProcessing, setIsProcessing] = useState(false)
	const [isZipping, setIsZipping] = useState(false)
	const [copiedHtml, setCopiedHtml] = useState(false)
	const [copiedManifest, setCopiedManifest] = useState(false)
	const [activeTab, setActiveTab] = useState<FaviconTab>("icons")
	const [bgPadding, setBgPadding] = useState<number>(0)
	const [bgColor, setBgColor] = useState<string>("transparent")
	const [borderRadius, setBorderRadius] = useState<number>(0)
	const [isDragging, setIsDragging] = useState(false)

	const fileInputRef = useRef<HTMLInputElement>(null)
	const {showToast} = useToast()

	const renderIconsFromImage = useCallback(
		(imgElement: HTMLImageElement) => {
			setIsProcessing(true)
			try {
				const results: RenderedFavicon[] = []

				const drawToCanvas = (
					width: number,
					height: number,
				): HTMLCanvasElement => {
					const canvas = document.createElement("canvas")
					canvas.width = width
					canvas.height = height
					const ctx = canvas.getContext("2d")
					if (!ctx) return canvas

					ctx.imageSmoothingEnabled = true
					ctx.imageSmoothingQuality = "high"

					if (bgColor !== "transparent") {
						ctx.fillStyle = bgColor
						if (borderRadius > 0) {
							const r = (borderRadius / 100) * (width / 2)
							ctx.beginPath()
							ctx.roundRect(0, 0, width, height, r)
							ctx.fill()
							ctx.clip()
						} else {
							ctx.fillRect(0, 0, width, height)
						}
					} else if (borderRadius > 0) {
						const r = (borderRadius / 100) * (width / 2)
						ctx.beginPath()
						ctx.roundRect(0, 0, width, height, r)
						ctx.clip()
					}

					const pad = (bgPadding / 100) * width
					const drawW = width - pad * 2
					const drawH = height - pad * 2
					ctx.drawImage(imgElement, pad, pad, drawW, drawH)

					return canvas
				}

				// PNG presets
				for (const preset of FAVICON_PRESETS) {
					if (preset.format === "ico") continue

					const canvas = drawToCanvas(preset.width, preset.height)
					const dataUrl = canvas.toDataURL("image/png")

					const byteString = atob(dataUrl.split(",")[1])
					const ab = new ArrayBuffer(byteString.length)
					const ia = new Uint8Array(ab)
					for (let i = 0; i < byteString.length; i++) {
						ia[i] = byteString.charCodeAt(i)
					}
					const blob = new Blob([ab], {type: "image/png"})

					results.push({
						filename: preset.filename,
						name: preset.name,
						width: preset.width,
						height: preset.height,
						format: "png",
						dataUrl,
						blob,
						sizeBytes: blob.size,
					})
				}

				// Multi-size ICO (16, 32, 48)
				const ico16 = drawToCanvas(16, 16)
				const ico32 = drawToCanvas(32, 32)
				const ico48 = drawToCanvas(48, 48)
				const icoPreviewUrl = ico48.toDataURL("image/png")

				createIcoFromCanvases([ico16, ico32, ico48])
					.then((icoBlob) => {
						const icoDataUrl = URL.createObjectURL(icoBlob)
						results.unshift({
							filename: "favicon.ico",
							name: "Multi-Resolution Favicon",
							width: 48,
							height: 48,
							format: "ico",
							dataUrl: icoDataUrl,
							previewDataUrl: icoPreviewUrl,
							blob: icoBlob,
							sizeBytes: icoBlob.size,
						})
						setRenderedIcons(results)
						setIsProcessing(false)
					})
					.catch((err) => {
						console.error("Failed to generate ICO:", err)
						setRenderedIcons(results)
						setIsProcessing(false)
					})
			} catch (err: any) {
				console.error("Error processing icons:", err)
				showToast("Failed to process icons", "error")
				setIsProcessing(false)
			}
		},
		[bgColor, bgPadding, borderRadius, showToast],
	)

	const handleFileSelect = (file: File) => {
		if (!file.type.startsWith("image/")) {
			showToast("Please upload a valid image file", "error")
			return
		}

		setImageName(file.name.replace(/\.[^/.]+$/, ""))
		const reader = new FileReader()
		reader.onload = (e) => {
			const src = e.target?.result as string
			setImageSrc(src)

			const img = new Image()
			img.onload = () => renderIconsFromImage(img)
			img.src = src
		}
		reader.readAsDataURL(file)
	}

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}

	const handleDragLeave = () => {
		setIsDragging(false)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		const file = e.dataTransfer.files?.[0]
		if (file) handleFileSelect(file)
	}

	const handlePasteFromClipboard = async () => {
		try {
			if (navigator.clipboard?.read) {
				const items = await navigator.clipboard.read()
				for (const item of items) {
					for (const type of item.types) {
						if (type.startsWith("image/")) {
							const blob = await item.getType(type)
							const file = new File(
								[blob],
								"clipboard-icon.png",
								{type: blob.type},
							)
							handleFileSelect(file)
							return
						}
					}
				}
			}
			showToast("No image found in clipboard", "info")
		} catch {
			showToast(
				"Clipboard access restricted. Press ⌘V / Ctrl+V to paste.",
				"info",
			)
		}
	}

	const handleDownloadSingle = (icon: RenderedFavicon) => {
		const url = URL.createObjectURL(icon.blob)
		const a = document.createElement("a")
		a.href = url
		a.download = icon.filename
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
		showToast(`Downloaded ${icon.filename}`, "success")
	}

	const handleDownloadAllZip = async () => {
		if (renderedIcons.length === 0) return
		setIsZipping(true)
		try {
			const zip = new JSZip()
			const folder = zip.folder("favicons") || zip

			for (const icon of renderedIcons) {
				folder.file(icon.filename, icon.blob)
			}
			folder.file("site.webmanifest", generateWebManifest(appName))
			folder.file("favicon-snippet.html", generateHtmlSnippet(appName))

			const zipBlob = await zip.generateAsync({type: "blob"})
			const zipUrl = URL.createObjectURL(zipBlob)
			const a = document.createElement("a")
			a.href = zipUrl
			a.download = `${imageName || "favicons"}-package.zip`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(zipUrl)

			showToast("Favicon package downloaded (.zip)", "success")
		} catch (err: any) {
			console.error("ZIP creation error:", err)
			showToast("Failed to create ZIP package", "error")
		} finally {
			setIsZipping(false)
		}
	}

	const handleRecompute = () => {
		if (!imageSrc) return
		const img = new Image()
		img.onload = () => renderIconsFromImage(img)
		img.src = imageSrc
	}

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`
		return `${(bytes / 1024).toFixed(1)} KB`
	}

	return (
		<div className="flex-1 flex flex-col gap-3 p-3">
			{/* Dropzone & Loaded Source Card */}
			{!imageSrc ? (
				<div
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					className={`flex-1 min-h-[70vh] flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed transition-all duration-200 text-center animate-card-entrance ${
						isDragging
							? "border-[#008060] bg-[#008060]/5 scale-[0.99]"
							: "border-(--p-border) bg-(--p-surface) hover:border-[#008060]/50"
					}`}
				>
					<div className="w-14 h-14 rounded-full bg-[#008060]/10 flex items-center justify-center text-[#008060] dark:text-[#34d399] mb-3">
						<ImageIcon size={30} />
					</div>

					<h3 className="text-xs font-semibold text-(--p-text) mb-1">
						Drop image here, paste, or browse
					</h3>
					<p className="text-[10px] text-(--p-text-subdued) max-w-xs mb-4">
						Supports PNG, SVG, JPG, WebP. High-res square image
						(512x512) recommended.
					</p>

					<div className="flex flex-wrap items-center justify-center gap-2">
						<Button
							variant="default"
							size="xs"
							onClick={() => fileInputRef.current?.click()}
							className="px-3"
						>
							<UploadIcon size={14} />
							<span className="text-nowrap">Upload Image</span>
						</Button>

						<Button
							variant="secondary"
							size="xs"
							onClick={handlePasteFromClipboard}
							className="px-3"
						>
							<ClipboardIcon size={14} />
							<span className="text-nowrap">
								Paste Clipboard (⌘V)
							</span>
						</Button>
					</div>

					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0]
							if (f) handleFileSelect(f)
						}}
					/>
				</div>
			) : (
				<div className="flex items-center justify-between p-2.5 rounded-lg border border-(--p-border) bg-(--p-surface)">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-(--p-canvas) border border-(--p-border) flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
							<img
								src={imageSrc}
								alt="Preview"
								className="w-full h-full object-contain"
							/>
						</div>
						<div className="min-w-0">
							<div className="text-xs font-semibold text-(--p-text) truncate">
								{imageName || "favicon-source"}
							</div>
							<div className="text-[11px] text-(--p-text-subdued)">
								Source image active
							</div>
						</div>
					</div>

					<button
						onClick={() => fileInputRef.current?.click()}
						className="h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors bg-(--p-surface-subdued) hover:bg-(--p-surface-hover) text-(--p-text) border border-(--p-border) flex items-center gap-1.5 shrink-0"
						title="Change image"
					>
						<RefreshIcon size={13} />
						<span>Replace</span>
					</button>

					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0]
							if (f) handleFileSelect(f)
						}}
					/>
				</div>
			)}

			{/* Canvas Settings Card */}
			{imageSrc && (
				<div className="p-3 rounded-lg border border-(--p-border) bg-(--p-surface) flex flex-col gap-2.5">
					<div className="flex items-center justify-between text-[11px]">
						<span className="text-(--p-text-subdued) font-medium">
							Canvas Options
						</span>
						<span className="text-[10px] text-(--p-text-subdued)">
							Live regeneration
						</span>
					</div>

					<div className="grid grid-cols-2 gap-2.5">
						<div className="flex flex-col gap-1">
							<div className="flex items-center justify-between text-[11px]">
								<span className="text-(--p-text-subdued)">
									Padding:
								</span>
								<span className="tabular-nums font-mono text-[10px]">
									{bgPadding}%
								</span>
							</div>
							<input
								type="range"
								min="0"
								max="30"
								value={bgPadding}
								onChange={(e) =>
									setBgPadding(Number(e.target.value))
								}
								onMouseUp={handleRecompute}
								onTouchEnd={handleRecompute}
								className="w-full accent-[#008060] cursor-pointer"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<div className="flex items-center justify-between text-[11px]">
								<span className="text-(--p-text-subdued)">
									Radius:
								</span>
								<span className="tabular-nums font-mono text-[10px]">
									{borderRadius}%
								</span>
							</div>
							<input
								type="range"
								min="0"
								max="50"
								value={borderRadius}
								onChange={(e) =>
									setBorderRadius(Number(e.target.value))
								}
								onMouseUp={handleRecompute}
								onTouchEnd={handleRecompute}
								className="w-full accent-[#008060] cursor-pointer"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-2 pt-1 border-t border-(--p-border-subtle)">
						<div className="flex flex-col gap-1">
							<span className="text-[11px] text-(--p-text-subdued)">
								Background Color
							</span>
							<div className="flex items-center gap-1.5">
								<label
									className="relative w-8 h-8 rounded-lg border border-(--p-border) overflow-hidden cursor-pointer shrink-0 shadow-xs hover:border-(--p-border-hover) transition-colors"
									style={{
										backgroundColor:
											bgColor === "transparent"
												? "#ffffff"
												: bgColor,
									}}
									title="Choose custom background color"
								>
									<input
										type="color"
										value={
											bgColor === "transparent"
												? "#ffffff"
												: bgColor
										}
										onChange={(e) => {
											setBgColor(e.target.value)
											setTimeout(handleRecompute, 10)
										}}
										className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
									/>
								</label>
								<button
									onClick={() => {
										setBgColor("transparent")
										setTimeout(handleRecompute, 10)
									}}
									className={`h-8 px-2.5 rounded-lg text-[10px] font-medium cursor-pointer transition-colors border border-(--p-border) ${
										bgColor === "transparent"
											? "bg-[#008060] text-white font-semibold shadow-xs"
											: "bg-(--p-surface-subdued) text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
									}`}
								>
									Clear (Alpha)
								</button>
							</div>
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-[11px] text-(--p-text-subdued)">
								PWA App Name
							</span>
							<Input
								value={appName}
								onChange={(e) => setAppName(e.target.value)}
								className="h-8 text-xs"
								placeholder="e.g. My App"
							/>
						</div>
					</div>
				</div>
			)}

			{/* Polaris Segmented Tabs (Matches Password Generator pattern) */}
			{imageSrc && (
				<div className="flex items-center gap-1 p-0.5 bg-(--p-surface-subdued) border border-(--p-border) rounded-lg">
					<button
						onClick={() => setActiveTab("icons")}
						className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
							activeTab === "icons"
								? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
								: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
						}`}
					>
						<ImageIcon size={15} />
						<span>Generated Icons</span>
						<span
							className={`text-[9px] px-1.5 py-0.2 rounded-lg tabular-nums ${
								activeTab === "icons"
									? "bg-white/20 text-white font-semibold"
									: "bg-(--p-border) text-(--p-text)"
							}`}
						>
							{renderedIcons.length}
						</span>
					</button>

					<button
						onClick={() => setActiveTab("code")}
						className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
							activeTab === "code"
								? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
								: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
						}`}
					>
						<CodeIcon size={15} />
						<span>HTML & Manifest</span>
					</button>
				</div>
			)}

			{/* TAB 1: ICONS LIST & ALL-ZIP DOWNLOAD ACTION */}
			{imageSrc && activeTab === "icons" && (
				<div className="flex flex-col gap-2.5">
					<div className="flex items-center justify-between text-[11px] px-0.5">
						<span className="text-(--p-text-subdued) font-medium">
							Download individual icons or complete package
						</span>
						<Button
							size="xs"
							variant="default"
							onClick={handleDownloadAllZip}
							disabled={isZipping || renderedIcons.length === 0}
							className="gap-1.5"
						>
							<ArchiveIcon size={13} />
							<span>
								{isZipping ? "Packing..." : "Download ZIP"}
							</span>
						</Button>
					</div>

					<div className="flex flex-col gap-2">
						{isProcessing ? (
							<div className="p-8 text-center text-(--p-text-subdued) text-xs flex flex-col items-center justify-center gap-2">
								<div className="w-5 h-5 rounded-full border-2 border-(--p-border) border-t-[#008060] animate-spin" />
								<span>
									Generating multi-resolution icon assets...
								</span>
							</div>
						) : (
							renderedIcons.map((icon) => (
								<div
									key={icon.filename}
									className="flex items-center justify-between p-2 rounded-lg bg-(--p-surface) border border-(--p-border) hover:bg-(--p-subdued) transition-all"
								>
									<div className="flex items-center gap-2.5 min-w-0">
										<img
											src={
												icon.previewDataUrl ||
												icon.dataUrl
											}
											alt={icon.name}
											className="w-6 h-6 object-contain"
										/>
										<div className="min-w-0">
											<div className="flex items-center gap-1.5">
												<span className="font-mono text-xs font-semibold text-(--p-text) truncate">
													{icon.filename}
												</span>
												<Badge variant="secondary">
													{icon.width}x{icon.height}
												</Badge>
											</div>
											<div className="text-[11px] text-(--p-text-subdued) truncate">
												{icon.name} ·{" "}
												{formatSize(icon.sizeBytes)}
											</div>
										</div>
									</div>

									<button
										onClick={() =>
											handleDownloadSingle(icon)
										}
										className="w-7 h-7 rounded-lg flex items-center justify-center text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover) border border-(--p-border) cursor-pointer transition-colors shrink-0"
										title={`Download ${icon.filename}`}
									>
										<DownloadIcon size={14} />
									</button>
								</div>
							))
						)}
					</div>
				</div>
			)}

			{/* TAB 2: HTML & WEB MANIFEST */}
			{imageSrc && activeTab === "code" && (
				<div className="flex flex-col gap-3">
					<div className="p-3 rounded-lg border border-(--p-border) bg-(--p-surface) flex flex-col gap-2">
						<div className="flex items-center justify-between text-[11px]">
							<span className="text-(--p-text-subdued) font-medium">
								HTML &lt;head&gt; Link Tags
							</span>
							<Button
								size="xs"
								variant="default"
								onClick={() => {
									navigator.clipboard.writeText(
										generateHtmlSnippet(appName),
									)
									setCopiedHtml(true)
									showToast("HTML snippet copied", "success")
									setTimeout(() => setCopiedHtml(false), 1500)
								}}
								className="gap-1"
							>
								{copiedHtml ? (
									<CheckIcon size={12} />
								) : (
									<CopyIcon size={12} />
								)}
								<span>
									{copiedHtml ? "Copied" : "Copy HTML"}
								</span>
							</Button>
						</div>

						<div className="p-2.5 rounded-lg bg-(--p-canvas) border border-(--p-border) font-mono text-[11px] text-(--p-text) overflow-x-auto select-all break-all leading-relaxed whitespace-pre">
							{generateHtmlSnippet(appName)}
						</div>
					</div>

					<div className="p-3 rounded-lg border border-(--p-border) bg-(--p-surface) flex flex-col gap-2">
						<div className="flex items-center justify-between text-[11px]">
							<span className="text-(--p-text-subdued) font-medium">
								site.webmanifest (PWA configuration)
							</span>
							<Button
								size="xs"
								variant="default"
								onClick={() => {
									navigator.clipboard.writeText(
										generateWebManifest(appName),
									)
									setCopiedManifest(true)
									showToast("Manifest copied", "success")
									setTimeout(
										() => setCopiedManifest(false),
										1500,
									)
								}}
								className="gap-1"
							>
								{copiedManifest ? (
									<CheckIcon size={12} />
								) : (
									<CopyIcon size={12} />
								)}
								<span>
									{copiedManifest ? "Copied" : "Copy JSON"}
								</span>
							</Button>
						</div>

						<div className="p-2.5 rounded-lg bg-(--p-canvas) border border-(--p-border) font-mono text-[11px] text-(--p-text) overflow-x-auto select-all break-all leading-relaxed whitespace-pre">
							{generateWebManifest(appName)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
