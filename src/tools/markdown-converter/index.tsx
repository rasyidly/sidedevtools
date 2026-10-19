import React, {useState, useRef, useEffect} from "react"
import {
	DocumentIcon,
	UploadIcon,
	CopyIcon,
	CheckIcon,
	DownloadIcon,
	RefreshIcon,
	AlertIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {useToast} from "@/components/ui/toast"
import initAnyDoc, {
	formatFromBytes,
	formatFromPath,
	toMarkdownBytes,
} from "./wasm/anydoc_wasm"

type ViewTab = "preview" | "source"

let wasmInitPromise: Promise<any> | null = null

function ensureAnyDocInitialized() {
	if (!wasmInitPromise) {
		const wasmUrl =
			typeof chrome !== "undefined" && chrome.runtime?.getURL
				? chrome.runtime.getURL("anydoc/anydoc_wasm_bg.wasm")
				: "/anydoc/anydoc_wasm_bg.wasm"

		wasmInitPromise = initAnyDoc({module_or_path: wasmUrl}).catch((err) => {
			wasmInitPromise = null
			throw err
		})
	}
	return wasmInitPromise
}

export function MarkdownConverterView() {
	const [status, setStatus] = useState<
		"idle" | "converting" | "done" | "error"
	>("idle")
	const [markdown, setMarkdown] = useState("")
	const [fileName, setFileName] = useState("")
	const [fileSize, setFileSize] = useState("")
	const [detectedFormat, setDetectedFormat] = useState("")
	const [errorMessage, setErrorMessage] = useState("")
	const [viewTab, setViewTab] = useState<ViewTab>("preview")
	const [isDragging, setIsDragging] = useState(false)
	const [isCopied, setIsCopied] = useState(false)

	const fileInputRef = useRef<HTMLInputElement>(null)
	const {showToast} = useToast()

	// Preload WASM on view mount
	useEffect(() => {
		ensureAnyDocInitialized().catch((err) => {
			console.warn("AnyDoc pre-initialization notice:", err)
		})
	}, [])

	const formatBytes = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	}

	const convertFile = async (file: File) => {
		try {
			setStatus("converting")
			setErrorMessage("")
			setFileName(file.name)
			setFileSize(formatBytes(file.size))

			await ensureAnyDocInitialized()

			const arrayBuffer = await file.arrayBuffer()
			const bytes = new Uint8Array(arrayBuffer)

			// Detect format from file content or extension fallback
			let format = formatFromBytes(bytes)
			if (!format) {
				format = formatFromPath(file.name)
			}

			// Signature-less formats like CSV require explicit format
			if (!format && file.name.toLowerCase().endsWith(".csv")) {
				format = "csv" as any
			}

			setDetectedFormat(format ? String(format).toUpperCase() : "AUTO")

			const md = toMarkdownBytes(bytes, format || null)
			setMarkdown(md)
			setStatus("done")
			setViewTab("preview")
			showToast("Converted to Markdown successfully", "success")
		} catch (err: any) {
			console.error("AnyDoc conversion failed:", err)
			setStatus("error")
			const code = err?.code
			let friendlyMsg =
				err?.message || "Failed to convert document to Markdown."

			if (code === "needsOcr") {
				friendlyMsg =
					"Scanned or image-only PDF detected. Pure image PDFs require OCR which is not supported locally."
			} else if (code === "encrypted") {
				friendlyMsg =
					"This document is password protected or encrypted and cannot be converted."
			} else if (code === "unsupported") {
				friendlyMsg =
					"This file format is not supported. Supported: Word, PowerPoint, Excel, PDF, EPUB, RTF, CSV, ODF."
			}

			setErrorMessage(friendlyMsg)
			showToast("Conversion failed", "error")
		}
	}

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) convertFile(file)
	}

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		if (e.currentTarget === e.target) {
			setIsDragging(false)
		}
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		const file = e.dataTransfer.files?.[0]
		if (file) convertFile(file)
	}

	const handleCopy = async () => {
		if (!markdown) return
		try {
			await navigator.clipboard.writeText(markdown)
			setIsCopied(true)
			showToast("Markdown copied to clipboard", "success")
			setTimeout(() => setIsCopied(false), 1200)
		} catch {
			showToast("Failed to copy Markdown", "error")
		}
	}

	const handleDownload = () => {
		if (!markdown) return
		const blob = new Blob([markdown], {type: "text/markdown;charset=utf-8"})
		const url = URL.createObjectURL(blob)
		const a = document.createElement("a")
		const baseName = fileName
			? fileName.replace(/\.[^/.]+$/, "")
			: "document"
		a.href = url
		a.download = `${baseName}.md`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
		showToast("Markdown downloaded", "success")
	}

	const handleReset = () => {
		setStatus("idle")
		setMarkdown("")
		setFileName("")
		setFileSize("")
		setDetectedFormat("")
		setErrorMessage("")
	}

	// Stats
	const lineCount = markdown ? markdown.split("\n").length : 0
	const wordCount = markdown
		? markdown.trim().split(/\s+/).filter(Boolean).length
		: 0
	const charCount = markdown.length

	return (
		<div
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			className="relative flex-1 flex flex-col gap-3 p-3 min-h-0"
		>
			{/* Drag overlay */}
			{isDragging && (
				<div className="absolute inset-2 z-40 rounded-lg border-2 border-dashed border-[#008060] bg-(--p-surface)/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center pointer-events-none animate-card-entrance shadow-xl">
					<UploadIcon
						size={32}
						className="text-[#008060] dark:text-[#34d399] mb-2"
					/>
					<p className="text-xs font-semibold text-(--p-text)">
						Drop Document Here
					</p>
					<p className="text-[10px] text-(--p-text-subdued) mt-0.5 max-w-xs">
						Converts Word, PDF, Excel, PowerPoint, EPUB, RTF, CSV to
						GitHub Markdown
					</p>
				</div>
			)}

			{/* Status: Idle State */}
			{status === "idle" && (
				<div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-(--p-border) bg-(--p-surface) hover:border-[#008060]/50 transition-all text-center animate-card-entrance">
					<div className="w-14 h-14 rounded-full bg-[#008060]/10 flex items-center justify-center text-[#008060] dark:text-[#34d399] mb-3">
						<DocumentIcon size={30} />
					</div>

					<h3 className="text-xs font-semibold text-(--p-text) mb-1">
						Convert Anything to Markdown
					</h3>
					<p className="text-[10px] text-(--p-text-subdued) max-w-xs mb-4 leading-relaxed">
						Powered by Firecrawl AnyDoc WebAssembly. 100%
						client-side conversion. Your confidential files never
						touch an external server.
					</p>

					<div className="flex items-center gap-2 mb-4">
						<Button
							variant="default"
							size="xs"
							onClick={() => fileInputRef.current?.click()}
							className="px-3"
						>
							<UploadIcon size={14} />
							<span>Choose Document</span>
						</Button>
					</div>

					<input
						ref={fileInputRef}
						type="file"
						accept=".doc,.docx,.ppt,.pptx,.xls,.xlsx,.pdf,.odt,.ods,.odp,.rtf,.epub,.csv"
						onChange={handleFileSelect}
						className="hidden"
					/>

					{/* Supported format chips */}
					<div className="flex flex-wrap items-center justify-center gap-1 max-w-xs text-[9px] text-(--p-text-subdued)">
						{[
							"DOCX",
							"PDF",
							"PPTX",
							"XLSX",
							"CSV",
							"EPUB",
							"RTF",
							"ODT",
						].map((ext) => (
							<span
								key={ext}
								className="px-1.5 py-0.5 rounded-md bg-(--p-canvas) border border-(--p-border) font-mono"
							>
								.{ext.toLowerCase()}
							</span>
						))}
					</div>
				</div>
			)}

			{/* Status: Converting */}
			{status === "converting" && (
				<div className="flex-1 min-h-[60vh] my-auto flex flex-col items-center justify-center p-8 rounded-lg border border-(--p-border) bg-(--p-surface) text-center animate-card-entrance shadow-xs">
					<div className="w-9 h-9 rounded-full border-2 border-(--p-border) border-t-[#008060] animate-spin mb-3" />
					<h3 className="text-xs font-semibold text-(--p-text) mb-1">
						Parsing & Serializing to Markdown...
					</h3>
					<p className="text-[10px] text-(--p-text-subdued) max-w-xs truncate">
						{fileName} ({fileSize})
					</p>
				</div>
			)}

			{/* Status: Error */}
			{status === "error" && (
				<div className="flex flex-col items-center justify-center p-6 rounded-lg border border-rose-500/30 bg-rose-500/5 text-center animate-card-entrance my-auto">
					<AlertIcon size={26} className="text-rose-500 mb-2" />
					<h3 className="text-xs font-semibold text-(--p-text) mb-1">
						Conversion Failed
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
						<span>Try Another File</span>
					</Button>
				</div>
			)}

			{/* Status: Done (Result View) */}
			{status === "done" && (
				<div className="flex-1 flex flex-col gap-2 min-h-0 animate-card-entrance">
					{/* Header Meta & Toolbar */}
					<div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-(--p-border) bg-(--p-surface) shrink-0">
						<div className="flex items-center gap-2 overflow-hidden min-w-0">
							<div className="p-1.5 rounded-md bg-[#008060]/10 text-[#008060] dark:text-[#34d399] shrink-0">
								<DocumentIcon size={16} />
							</div>
							<div className="flex flex-col min-w-0">
								<span className="text-xs font-semibold text-(--p-text) truncate">
									{fileName}
								</span>
								<div className="flex items-center gap-1.5 text-[9px] text-(--p-text-subdued) tabular-nums overflow-x-auto">
									<span className="font-semibold text-[#008060] dark:text-[#34d399]">
										{detectedFormat}
									</span>
									<span className="text-nowrap">
										• {fileSize}
									</span>
									<span className="text-nowrap">
										• {wordCount} words
									</span>
									<span className="text-nowrap">
										• {charCount} chars
									</span>
									<span className="text-nowrap">
										• {lineCount} lines
									</span>
								</div>
							</div>
						</div>

						{/* View Switcher Tabs */}
						<div className="flex items-center gap-1 p-0.5 rounded-lg bg-(--p-canvas) border border-(--p-border) shrink-0">
							<button
								onClick={() => setViewTab("preview")}
								className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
									viewTab === "preview"
										? "bg-[#008060] text-white shadow-xs"
										: "text-(--p-text-subdued) hover:text-(--p-text)"
								}`}
							>
								Preview
							</button>
							<button
								onClick={() => setViewTab("source")}
								className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
									viewTab === "source"
										? "bg-[#008060] text-white shadow-xs"
										: "text-(--p-text-subdued) hover:text-(--p-text)"
								}`}
							>
								Source
							</button>
						</div>
					</div>

					{/* Action Buttons Toolbar */}
					<div className="flex items-center gap-1.5 shrink-0">
						<Button
							variant="default"
							size="xs"
							onClick={handleCopy}
							className="flex-1 h-7 text-[11px] justify-center"
						>
							{isCopied ? (
								<>
									<CheckIcon size={14} />
									<span>Copied!</span>
								</>
							) : (
								<>
									<CopyIcon size={14} />
									<span>Copy Markdown</span>
								</>
							)}
						</Button>

						<Button
							variant="secondary"
							size="xs"
							onClick={handleDownload}
							className="h-7 text-[11px] justify-center px-3"
							title="Download .md file"
						>
							<DownloadIcon size={14} />
							<span>Download</span>
						</Button>

						<Button
							variant="ghost"
							size="xs"
							onClick={handleReset}
							className="h-7 text-[11px] justify-center px-2 text-(--p-text-subdued)"
							title="Convert another document"
						>
							<RefreshIcon size={14} />
						</Button>
					</div>

					{/* Content Display: Rendered Preview or Raw Source */}
					{viewTab === "source" ? (
						<textarea
							value={markdown}
							onChange={(e) => setMarkdown(e.target.value)}
							className="flex-1 rounded-lg border border-(--p-border) bg-(--p-surface) w-full h-full resize-none font-mono text-xs focus:outline-none leading-relaxed select-all overflow-y-auto p-3"
							placeholder="Markdown output..."
						/>
					) : (
						<div className="flex-1 rounded-lg border border-(--p-border) bg-(--p-surface) prose prose-sm dark:prose-invert max-w-none text-xs text-(--p-text) leading-relaxed space-y-2 select-text overflow-y-auto p-3">
							{/* Render clean formatted preview */}
							{markdown.split("\n").map((line, idx) => {
								if (line.startsWith("# ")) {
									return (
										<h1
											key={idx}
											className="text-base font-semibold text-(--p-text) pb-1 mt-3 first:mt-0"
										>
											{line.slice(2)}
										</h1>
									)
								}
								if (line.startsWith("## ")) {
									return (
										<h2
											key={idx}
											className="text-sm font-semibold text-(--p-text) pb-0.5 mt-2"
										>
											{line.slice(3)}
										</h2>
									)
								}
								if (line.startsWith("### ")) {
									return (
										<h3
											key={idx}
											className="text-xs font-semibold text-(--p-text) mt-1.5"
										>
											{line.slice(4)}
										</h3>
									)
								}
								if (
									line.startsWith("- ") ||
									line.startsWith("* ")
								) {
									return (
										<li
											key={idx}
											className="list-disc list-inside ml-2 text-[11px]"
										>
											{line.slice(2)}
										</li>
									)
								}
								if (line.startsWith("|")) {
									return (
										<div
											key={idx}
											className="font-mono text-[10px] bg-(--p-canvas) px-1.5 py-0.5 rounded overflow-x-auto whitespace-pre"
										>
											{line}
										</div>
									)
								}
								if (line.trim() === "") {
									return <div key={idx} className="h-1" />
								}
								return (
									<p
										key={idx}
										className="text-[11px] leading-relaxed"
									>
										{line}
									</p>
								)
							})}
						</div>
					)}
				</div>
			)}
		</div>
	)
}
