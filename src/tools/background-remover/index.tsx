import {useState, useEffect, useRef, useCallback} from "react"
import {removeBackground} from "@imgly/background-removal"
import {
	EraserIcon,
	UploadIcon,
	ClipboardIcon,
	DownloadIcon,
	CopyIcon,
	CheckIcon,
	RefreshIcon,
	AlertIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {useToast} from "@/components/ui/toast"
import {initializeOnnxRuntime} from "./ort-setup"

type ViewMode = "result" | "original" | "split"
type ModelQuality = "isnet_fp16" | "isnet_quint8"

export function BackgroundRemoverView() {
	const [originalUrl, setOriginalUrl] = useState<string | null>(null)
	const [resultUrl, setResultUrl] = useState<string | null>(null)
	const [resultBlob, setResultBlob] = useState<Blob | null>(null)
	const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
		"idle",
	)
	const [progressMessage, setProgressMessage] = useState("")
	const [progressPercent, setProgressPercent] = useState<number | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [viewMode, setViewMode] = useState<ViewMode>("result")
	const [modelQuality, setModelQuality] = useState<ModelQuality>("isnet_fp16")
	const [imageDimensions, setImageDimensions] = useState<{
		width: number
		height: number
	} | null>(null)
	const [fileSize, setFileSize] = useState<string | null>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [isCopied, setIsCopied] = useState(false)

	const fileInputRef = useRef<HTMLInputElement>(null)
	const {showToast} = useToast()

	const objectUrlsRef = useRef<{
		original: string | null
		result: string | null
	}>({
		original: null,
		result: null,
	})

	// Clean up Object URLs strictly on unmount
	useEffect(() => {
		const urls = objectUrlsRef
		return () => {
			if (urls.current.original) {
				URL.revokeObjectURL(urls.current.original)
			}
			if (urls.current.result) {
				URL.revokeObjectURL(urls.current.result)
			}
		}
	}, [])

	const isCancelledRef = useRef(false)

	const formatBytes = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	}

	const processImage = useCallback(
		async (blobOrFile: Blob | File) => {
			isCancelledRef.current = false
			try {
				// Initialize and patch ONNX runtime environment for Chrome extension
				initializeOnnxRuntime()

				setStatus("loading")
				setErrorMessage(null)
				setProgressPercent(8)
				setProgressMessage("Preparing AI model & runtime...")

				// Revoke previous original URL if any, then allocate new one
				if (objectUrlsRef.current.original) {
					URL.revokeObjectURL(objectUrlsRef.current.original)
					objectUrlsRef.current.original = null
				}
				const origUrl = URL.createObjectURL(blobOrFile)
				objectUrlsRef.current.original = origUrl
				setOriginalUrl(origUrl)
				setFileSize(formatBytes(blobOrFile.size))

				// Extract dimensions from original image
				const img = new Image()
				img.onload = () => {
					if (!isCancelledRef.current) {
						setImageDimensions({
							width: img.naturalWidth || img.width,
							height: img.naturalHeight || img.height,
						})
					}
				}
				img.src = origUrl

				let maxPct = 8
				const updateProgress = (pct: number, label: string) => {
					if (isCancelledRef.current) return
					maxPct = Math.max(maxPct, pct)
					setProgressPercent(maxPct)
					setProgressMessage(label)
				}

				// Run background removal with explicit CDN publicPath and smooth progress
				const outputBlob = await removeBackground(blobOrFile, {
					publicPath:
						"https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
					model: modelQuality,
					output: {
						format: "image/png",
						quality: 0.9,
					},
					progress: (key: string, current: number, total: number) => {
						if (isCancelledRef.current) return

						if (key.startsWith("fetch")) {
							const friendlyKey = key.includes("wasm")
								? "Downloading WebAssembly AI engine..."
								: key.includes("resources")
									? "Verifying model configuration..."
									: "Downloading AI neural weights..."

							if (total > 0) {
								const ratio = Math.min(
									1,
									Math.max(0, current / total),
								)
								// Map download phase to 10% - 65%
								const pct = Math.round(10 + ratio * 55)
								updateProgress(pct, friendlyKey)
							} else {
								updateProgress(20, friendlyKey)
							}
						} else if (key === "compute:decode") {
							updateProgress(70, "Decoding image bitmap...")
						} else if (key === "compute:inference") {
							updateProgress(
								85,
								"Segmenting foreground with AI...",
							)
						} else if (key === "compute:mask") {
							updateProgress(93, "Refining edge transparency...")
						} else if (key === "compute:encode") {
							const pct = current >= total ? 100 : 97
							updateProgress(pct, "Exporting transparent PNG...")
						}
					},
				})

				if (isCancelledRef.current) return

				// Revoke previous result URL if any, then allocate new one
				if (objectUrlsRef.current.result) {
					URL.revokeObjectURL(objectUrlsRef.current.result)
					objectUrlsRef.current.result = null
				}
				const resUrl = URL.createObjectURL(outputBlob)
				objectUrlsRef.current.result = resUrl

				setProgressPercent(100)
				setProgressMessage("Complete!")
				setResultBlob(outputBlob)
				setResultUrl(resUrl)
				setStatus("done")
				setViewMode("result")
				showToast("Background removed successfully", "success")
			} catch (err: any) {
				if (isCancelledRef.current) return
				console.error("Background removal error:", err)
				setStatus("error")
				setErrorMessage(
					err?.message ||
						"Failed to remove background. Ensure WebAssembly is supported and model assets can be reached.",
				)
				showToast("Background removal failed", "error")
			}
		},
		[modelQuality, showToast],
	)

	// File selection handler
	const handleSelectFile = (file: File) => {
		if (!file.type.startsWith("image/")) {
			showToast("Please choose an image file (PNG, JPG, WEBP)", "error")
			return
		}
		processImage(file)
	}

	// Clipboard paste handler (button)
	const handlePasteFromClipboard = async () => {
		try {
			if (navigator.clipboard?.read) {
				const items = await navigator.clipboard.read()
				for (const item of items) {
					for (const type of item.types) {
						if (type.startsWith("image/")) {
							const blob = await item.getType(type)
							processImage(blob)
							return
						}
					}
				}
			}

			// Fallback: check if text URL in clipboard
			const text = await navigator.clipboard.readText()
			if (
				text &&
				/^https?:\/\/.*\.(png|jpe?g|webp|gif|bmp)(\?.*)?$/i.test(
					text.trim(),
				)
			) {
				const res = await fetch(text.trim())
				const blob = await res.blob()
				processImage(blob)
				return
			}

			showToast(
				"No image in clipboard. Press ⌘V / Ctrl+V or copy an image first.",
				"info",
			)
		} catch (err: any) {
			console.warn("Clipboard access warning:", err)
			showToast(
				"Clipboard access restricted. Press ⌘V / Ctrl+V to paste directly.",
				"info",
			)
		}
	}

	// Global paste listener when inside this tool
	useEffect(() => {
		const handleGlobalPaste = (e: ClipboardEvent) => {
			const items = e.clipboardData?.items
			if (!items) return

			for (let i = 0; i < items.length; i++) {
				const item = items[i]
				if (item.type.startsWith("image/")) {
					const file = item.getAsFile()
					if (file) {
						e.preventDefault()
						processImage(file)
						return
					}
				}
			}
		}

		window.addEventListener("paste", handleGlobalPaste)
		return () => window.removeEventListener("paste", handleGlobalPaste)
	}, [processImage])

	// Drag & drop handlers
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		const file = e.dataTransfer.files?.[0]
		if (file) handleSelectFile(file)
	}

	// Download result
	const handleDownload = () => {
		if (!resultUrl) return
		const a = document.createElement("a")
		a.href = resultUrl
		a.download = `removed-bg-${Date.now()}.png`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		showToast("PNG downloaded", "success")
	}

	// Copy result PNG image to clipboard
	const handleCopyImage = async () => {
		if (!resultBlob) return
		try {
			await navigator.clipboard.write([
				new ClipboardItem({
					"image/png": resultBlob,
				}),
			])
			setIsCopied(true)
			showToast("Image copied to clipboard", "success")
			setTimeout(() => setIsCopied(false), 1200)
		} catch {
			showToast("Failed to copy image to clipboard", "error")
		}
	}

	// Cancel processing
	const handleCancel = () => {
		isCancelledRef.current = true
		handleReset()
		showToast("Background removal cancelled", "info")
	}

	// Reset
	const handleReset = () => {
		if (objectUrlsRef.current.original) {
			URL.revokeObjectURL(objectUrlsRef.current.original)
			objectUrlsRef.current.original = null
		}
		if (objectUrlsRef.current.result) {
			URL.revokeObjectURL(objectUrlsRef.current.result)
			objectUrlsRef.current.result = null
		}
		setOriginalUrl(null)
		setResultUrl(null)
		setResultBlob(null)
		setStatus("idle")
		setErrorMessage(null)
		setImageDimensions(null)
		setProgressPercent(null)
	}

	return (
		<div className="flex-1 flex flex-col gap-3 p-3 min-h-0">
			{/* Top Controls Bar without redundant heading */}
			<div className="flex items-center justify-between text-[11px] shrink-0">
				<span className="text-[10px] font-semibold text-(--p-text-subdued) uppercase tracking-wider">
					Segmentation Engine
				</span>

				<div className="flex items-center gap-1.5">
					<span className="text-[10px] text-(--p-text-subdued)">
						Model:
					</span>
					<select
						value={modelQuality}
						onChange={(e) =>
							setModelQuality(e.target.value as ModelQuality)
						}
						disabled={status === "loading"}
						className="h-6 px-1.5 rounded-lg border border-(--p-border) bg-(--p-surface) text-[10px] text-(--p-text) focus:outline-none focus:border-[#008060]"
					>
						<option value="isnet_fp16">Balanced (Default)</option>
						<option value="isnet_quint8">
							Fast & Small (~40MB)
						</option>
					</select>
				</div>
			</div>

			{/* Empty / Initial State (Full Height Dropzone & Paste) */}
			{status === "idle" && (
				<div
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					className={`flex-1 min-h-[75vh] flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed transition-all duration-200 text-center animate-card-entrance ${
						isDragging
							? "border-[#008060] bg-[#008060]/5 scale-[0.99]"
							: "border-(--p-border) bg-(--p-surface) hover:border-[#008060]/50"
					}`}
				>
					<div className="w-14 h-14 rounded-full bg-[#008060]/10 flex items-center justify-center text-[#008060] dark:text-[#34d399] mb-3">
						<EraserIcon size={30} />
					</div>

					<h3 className="text-xs font-semibold text-(--p-text) mb-1">
						Drop image here, paste, or browse
					</h3>
					<p className="text-[10px] text-(--p-text-subdued) max-w-xs mb-4">
						Supports PNG, JPG, WEBP. 100% client-side WebAssembly
						inference; images never leave your device.
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
						onChange={(e) => {
							const file = e.target.files?.[0]
							if (file) handleSelectFile(file)
						}}
						className="hidden"
					/>
				</div>
			)}

			{/* Loading State with Cancel Button */}
			{status === "loading" && (
				<div className="flex-1 min-h-[60vh] my-auto flex flex-col items-center justify-center p-8 rounded-lg border border-(--p-border) bg-(--p-surface) text-center animate-card-entrance shadow-xs">
					<div className="w-10 h-10 rounded-full border-2 border-(--p-border) border-t-[#008060] animate-spin mb-3" />
					<h3 className="text-xs font-semibold text-(--p-text) mb-1">
						{progressMessage || "Removing background..."}
					</h3>
					<p className="text-[10px] text-(--p-text-subdued) max-w-xs mb-3">
						First run downloads AI model weights to browser cache;
						subsequent runs are near-instant.
					</p>

					{progressPercent !== null && (
						<div className="w-full max-w-xs flex flex-col gap-1 mb-3">
							<div className="w-full h-1.5 rounded-full bg-(--p-border) overflow-hidden">
								<div
									className="h-full bg-[#008060] transition-all duration-200"
									style={{width: `${progressPercent}%`}}
								/>
							</div>
							<div className="flex justify-between text-[10px] text-(--p-text-subdued) tabular-nums">
								<span>Progress</span>
								<span>{progressPercent}%</span>
							</div>
						</div>
					)}

					<Button
						variant="secondary"
						size="xs"
						onClick={handleCancel}
						className="px-4 mt-1"
					>
						Cancel
					</Button>
				</div>
			)}

			{/* Error State */}
			{status === "error" && (
				<div className="flex flex-col items-center justify-center p-6 rounded-lg border border-rose-500/30 bg-rose-500/5 text-center animate-card-entrance">
					<AlertIcon size={26} className="text-rose-500 mb-2" />
					<h3 className="text-xs font-semibold text-(--p-text) mb-1">
						Processing Error
					</h3>
					<p className="text-[10px] text-(--p-text-subdued) max-w-xs mb-3">
						{errorMessage}
					</p>
					<Button
						variant="secondary"
						size="xs"
						onClick={handleReset}
						className="px-3"
					>
						<RefreshIcon size={14} />
						<span>Try Another Image</span>
					</Button>
				</div>
			)}

			{/* Success / Result State */}
			{status === "done" && resultUrl && originalUrl && (
				<div className="flex flex-col gap-2.5 animate-card-entrance">
					{/* Mode Tabs & Meta */}
					<div className="flex items-center justify-between">
						{/* View Mode Pills */}
						<div className="flex items-center gap-1 p-0.5 rounded-lg bg-(--p-surface) border border-(--p-border)">
							{(
								[
									{id: "result", label: "Transparent"},
									{id: "original", label: "Original"},
									{id: "split", label: "Side-by-Side"},
								] as const
							).map((tab) => (
								<button
									key={tab.id}
									onClick={() => setViewMode(tab.id)}
									className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
										viewMode === tab.id
											? "bg-[#008060] text-white shadow-xs"
											: "text-(--p-text-subdued) hover:text-(--p-text)"
									}`}
								>
									{tab.label}
								</button>
							))}
						</div>

						{/* Dimensions & Size Meta */}
						<div className="flex items-center gap-1.5 text-[10px] text-(--p-text-subdued) tabular-nums">
							{imageDimensions && (
								<span>
									{imageDimensions.width}×
									{imageDimensions.height}
								</span>
							)}
							{fileSize && <span>• {fileSize}</span>}
						</div>
					</div>

					{/* Image Preview Canvas Card */}
					<div className="relative rounded-lg border border-(--p-border) overflow-hidden bg-(--p-surface) flex items-center justify-center min-h-[220px] max-h-[360px]">
						{/* Checkerboard Pattern for Transparency */}
						<div
							className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none"
							style={{
								backgroundImage: `
									linear-gradient(45deg, #888 25%, transparent 25%),
									linear-gradient(-45deg, #888 25%, transparent 25%),
									linear-gradient(45deg, transparent 75%, #888 75%),
									linear-gradient(-45deg, transparent 75%, #888 75%)
								`,
								backgroundSize: "16px 16px",
								backgroundPosition:
									"0 0, 0 8px, 8px -8px, -8px 0px",
							}}
						/>

						{/* Single Removed Transparent Image */}
						{viewMode === "result" && (
							<img
								src={resultUrl}
								alt="Background Removed"
								className="relative z-10 max-h-[340px] max-w-full object-contain p-2"
							/>
						)}

						{/* Single Original Image */}
						{viewMode === "original" && (
							<img
								src={originalUrl}
								alt="Original"
								className="relative z-10 max-h-[340px] max-w-full object-contain p-2"
							/>
						)}

						{/* Side-by-side View */}
						{viewMode === "split" && (
							<div className="relative z-10 grid grid-cols-2 gap-2 p-2 w-full h-full">
								<div className="flex flex-col items-center">
									<span className="text-[9px] font-semibold uppercase text-(--p-text-subdued) mb-1">
										Original
									</span>
									<img
										src={originalUrl}
										alt="Original"
										className="max-h-[280px] max-w-full object-contain rounded-lg border border-(--p-border)"
									/>
								</div>
								<div className="flex flex-col items-center">
									<span className="text-[9px] font-semibold uppercase text-(--p-text-subdued) mb-1">
										Removed
									</span>
									<img
										src={resultUrl}
										alt="Removed"
										className="max-h-[280px] max-w-full object-contain rounded-lg border border-(--p-border)"
									/>
								</div>
							</div>
						)}
					</div>

					{/* Action Buttons Toolbar */}
					<div className="flex items-center gap-1.5">
						<Button
							variant="default"
							size="xs"
							onClick={handleDownload}
							className="flex-1 h-7 text-[11px] justify-center"
						>
							<DownloadIcon size={14} />
							<span>Download PNG</span>
						</Button>

						<Button
							variant="secondary"
							size="xs"
							onClick={handleCopyImage}
							className="h-7 text-[11px] justify-center px-3"
							title="Copy transparent PNG to clipboard"
						>
							{isCopied ? (
								<>
									<CheckIcon
										size={14}
										className="text-[#008060] dark:text-[#34d399]"
									/>
									<span className="text-[#008060] dark:text-[#34d399]">
										Copied
									</span>
								</>
							) : (
								<>
									<CopyIcon size={14} />
									<span>Copy Image</span>
								</>
							)}
						</Button>

						<Button
							variant="secondary"
							size="xs"
							onClick={handleReset}
							className="h-7 text-[11px] justify-center px-2.5"
							title="Remove background from another image"
						>
							<RefreshIcon size={14} />
							<span>New</span>
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
