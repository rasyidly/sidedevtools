import {useState, useEffect, useMemo, useRef, useCallback} from "react"
import * as OTPAuth from "otpauth"
import {
	CopyIcon,
	CheckIcon,
	RefreshIcon,
	QrCodeIcon,
	UploadIcon,
	ClipboardIcon,
	TrashIcon,
	BookmarkIcon,
	ChevronDownIcon,
	KeyIcon,
	AlertIcon,
	SearchIcon,
	LockIcon,
	DownloadIcon,
	EyeIcon,
	EyeOffIcon,
	ArrowLeftIcon,
	MaximizeIcon,
} from "@/components/ui/solar-icon"
import {Input} from "@/components/ui/input"
import {Button} from "@/components/ui/button"
import {Modal} from "@/components/ui/modal"
import {useToast} from "@/components/ui/toast"
import {
	scanQrFromDataUrl,
	scanQrFromImageBlob,
	parseOtpAuthUri,
} from "@/lib/qr-scanner"
import {captureRegion} from "@/lib/region-capture"

interface SavedTotpAccount {
	id: string
	label: string
	issuer: string
	secret: string
	algorithm: "SHA1" | "SHA256" | "SHA512"
	digits: number
	period: number
	createdAt: number
}

function generateRandomBase32(length = 16): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
	const array = new Uint8Array(length)
	crypto.getRandomValues(array)
	return Array.from(array, (byte) => chars[byte % chars.length]).join("")
}

export function TotpGeneratorView() {
	const [activeTab, setActiveTab] = useState<"authenticator" | "vault">(
		"authenticator",
	)
	const [secret, setSecret] = useState("JBSWY3DPEHPK3PXP")
	const [label, setLabel] = useState("admin@company.com")
	const [issuer, setIssuer] = useState("ACME")
	const [algorithm, setAlgorithm] = useState<"SHA1" | "SHA256" | "SHA512">(
		"SHA1",
	)
	const [digits, setDigits] = useState<number>(6)
	const [period, setPeriod] = useState<number>(30)
	const [showAdvanced, setShowAdvanced] = useState(false)
	const [isCapturing, setIsCapturing] = useState(false)
	const [isCopied, setIsCopied] = useState(false)
	const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null)
	const [now, setNow] = useState(() => Date.now())
	const [vaultSearch, setVaultSearch] = useState("")
	const [revealedSecrets, setRevealedSecrets] = useState<
		Record<string, boolean>
	>({})

	// Save Modal state
	const [isSaving, setIsSaving] = useState(false)
	const [saveLabel, setSaveLabel] = useState("")
	const [saveIssuer, setSaveIssuer] = useState("")
	const [isSurfaceDragging, setIsSurfaceDragging] = useState(false)

	const fileInputRef = useRef<HTMLInputElement>(null)
	const importInputRef = useRef<HTMLInputElement>(null)
	const {showToast} = useToast()

	// Close Save modal on Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isSaving) {
				setIsSaving(false)
			}
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [isSaving])

	// Saved accounts storage
	const [savedAccounts, setSavedAccounts] = useState<SavedTotpAccount[]>(
		() => {
			try {
				const saved = localStorage.getItem("SideDevTools_totp_accounts")
				if (saved) return JSON.parse(saved)
				return [
					{
						id: "sample-1",
						label: "admin@company.com",
						issuer: "ACME Corp",
						secret: "JBSWY3DPEHPK3PXP",
						algorithm: "SHA1",
						digits: 6,
						period: 30,
						createdAt: Date.now(),
					},
				]
			} catch {
				return []
			}
		},
	)

	useEffect(() => {
		try {
			localStorage.setItem(
				"SideDevTools_totp_accounts",
				JSON.stringify(savedAccounts),
			)
		} catch {}
	}, [savedAccounts])

	// Tick timer every 500ms
	useEffect(() => {
		const interval = setInterval(() => {
			setNow(Date.now())
		}, 500)
		return () => clearInterval(interval)
	}, [])

	// Clean secret
	const cleanSecret = useMemo(() => {
		return secret.replace(/[\s-]/g, "").toUpperCase()
	}, [secret])

	const isValidSecret = useMemo(() => {
		return Boolean(cleanSecret && /^[A-Z2-7]{4,}$/.test(cleanSecret))
	}, [cleanSecret])

	// Time calculations
	const epochSec = Math.floor(now / 1000)
	const remainingSec = period - (epochSec % period)
	const progressPercent = (remainingSec / period) * 100

	// Generate current & next token
	const {currentToken, nextToken} = useMemo(() => {
		if (!isValidSecret) {
			return {currentToken: "------", nextToken: "------"}
		}
		try {
			const totp = new OTPAuth.TOTP({
				issuer: issuer || undefined,
				label: label || undefined,
				algorithm,
				digits,
				period,
				secret: OTPAuth.Secret.fromBase32(cleanSecret),
			})

			const cur = totp.generate({timestamp: now})
			const nxt = totp.generate({timestamp: now + period * 1000})
			return {currentToken: cur, nextToken: nxt}
		} catch {
			return {currentToken: "------", nextToken: "------"}
		}
	}, [
		cleanSecret,
		isValidSecret,
		issuer,
		label,
		algorithm,
		digits,
		period,
		now,
	])

	// Format code with space in middle
	const formattedCode = useMemo(() => {
		if (!currentToken || currentToken === "------") return "------"
		const mid = Math.ceil(currentToken.length / 2)
		return `${currentToken.slice(0, mid)} ${currentToken.slice(mid)}`
	}, [currentToken])

	const handleCopyCurrent = () => {
		if (currentToken && currentToken !== "------") {
			navigator.clipboard.writeText(currentToken)
			setIsCopied(true)
			showToast("TOTP Code copied", "success")
			setTimeout(() => setIsCopied(false), 1200)
		}
	}

	const handleCopyAccountToken = (acc: SavedTotpAccount) => {
		try {
			const totp = new OTPAuth.TOTP({
				issuer: acc.issuer || undefined,
				label: acc.label || undefined,
				algorithm: acc.algorithm,
				digits: acc.digits,
				period: acc.period,
				secret: OTPAuth.Secret.fromBase32(
					acc.secret.replace(/[\s-]/g, "").toUpperCase(),
				),
			})
			const code = totp.generate({timestamp: now})
			navigator.clipboard.writeText(code)
			setCopiedAccountId(acc.id)
			showToast(`${acc.issuer || acc.label || "Token"} copied`, "success")
			setTimeout(() => setCopiedAccountId(null), 1200)
		} catch {
			showToast("Failed to generate token", "error")
		}
	}

	// Apply parsed OTPAuth data
	const applyParsedData = useCallback(
		(parsed: ReturnType<typeof parseOtpAuthUri>) => {
			if (!parsed) {
				showToast("No valid OTPAuth data or QR code found", "error")
				return
			}
			setSecret(parsed.secret)
			if (parsed.label) setLabel(parsed.label)
			if (parsed.issuer) setIssuer(parsed.issuer)
			if (parsed.algorithm) setAlgorithm(parsed.algorithm)
			if (parsed.digits) setDigits(parsed.digits)
			if (parsed.period) setPeriod(parsed.period)
			showToast("TOTP configured from QR / URI", "success")
		},
		[showToast],
	)

	// Drag-to-select region capture, then scan the selection for a QR code
	const handleCaptureRegion = async () => {
		setIsCapturing(true)
		try {
			const region = await captureRegion()
			if (!region) return // user cancelled
			const result = await scanQrFromDataUrl(region.dataUrl)
			if (result) {
				applyParsedData(parseOtpAuthUri(result))
			} else {
				showToast("No QR code detected in the selection", "error")
			}
		} catch (err: any) {
			if (err?.message) {
				showToast(err.message, "error")
			}
		} finally {
			setIsCapturing(false)
		}
	}

	// File upload QR scanning
	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		try {
			const result = await scanQrFromImageBlob(file)
			if (result) {
				const parsed = parseOtpAuthUri(result)
				applyParsedData(parsed)
			} else {
				showToast("No QR code found in uploaded image", "error")
			}
		} catch {
			showToast("Failed to scan uploaded image", "error")
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = ""
		}
	}

	// Clipboard scanning with permission fallback
	const handleScanClipboard = async () => {
		try {
			if (navigator.clipboard?.read) {
				try {
					const items = await navigator.clipboard.read()
					for (const item of items) {
						for (const type of item.types) {
							if (type.startsWith("image/")) {
								const blob = await item.getType(type)
								const result = await scanQrFromImageBlob(blob)
								if (result) {
									const parsed = parseOtpAuthUri(result)
									applyParsedData(parsed)
									return
								}
							}
						}
					}
				} catch {
					// Fall through to text read
				}
			}

			// Try reading text
			const text = await navigator.clipboard.readText()
			if (text) {
				const parsed = parseOtpAuthUri(text)
				if (parsed) {
					applyParsedData(parsed)
					return
				}
			}

			showToast(
				"No QR code or OTP secret in clipboard. Press ⌘V to paste.",
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
		const handlePaste = async (e: ClipboardEvent) => {
			const activeTag = document.activeElement?.tagName
			const items = e.clipboardData?.items
			if (!items) return

			for (let i = 0; i < items.length; i++) {
				const item = items[i]
				if (item.type.startsWith("image/")) {
					const file = item.getAsFile()
					if (file) {
						e.preventDefault()
						const result = await scanQrFromImageBlob(file)
						if (result) {
							const parsed = parseOtpAuthUri(result)
							applyParsedData(parsed)
						} else {
							showToast(
								"No QR code found in pasted image",
								"error",
							)
						}
						return
					}
				}
			}

			const text = e.clipboardData?.getData("text") || ""
			if (text.startsWith("otpauth://")) {
				if (activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
					e.preventDefault()
				}
				const parsed = parseOtpAuthUri(text)
				if (parsed) {
					applyParsedData(parsed)
				}
			}
		}

		window.addEventListener("paste", handlePaste)
		return () => window.removeEventListener("paste", handlePaste)
	}, [applyParsedData, showToast])

	// Save Modal triggers
	const handleOpenSaveModal = () => {
		if (!isValidSecret) {
			showToast("Cannot save: Invalid secret key", "error")
			return
		}
		setSaveIssuer(issuer || "")
		setSaveLabel(label || "")
		setIsSaving(true)
	}

	const handleConfirmSave = (e: React.FormEvent) => {
		e.preventDefault()
		const newAcc: SavedTotpAccount = {
			id: `totp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			label: saveLabel.trim() || label.trim() || "Account",
			issuer: saveIssuer.trim() || issuer.trim() || "Issuer",
			secret: cleanSecret,
			algorithm,
			digits,
			period,
			createdAt: Date.now(),
		}
		setSavedAccounts((prev) => [newAcc, ...prev])
		setIsSaving(false)
		showToast("Account saved to vault", "success")
	}

	const handleDeleteAccount = (id: string) => {
		setSavedAccounts((prev) => prev.filter((a) => a.id !== id))
		showToast("Account removed from vault", "info")
	}

	const handleLoadAccount = (acc: SavedTotpAccount) => {
		setSecret(acc.secret)
		setLabel(acc.label)
		setIssuer(acc.issuer)
		setAlgorithm(acc.algorithm)
		setDigits(acc.digits)
		setPeriod(acc.period)
		setActiveTab("authenticator")
		showToast(`Loaded ${acc.issuer || acc.label}`, "success")
	}

	// Export / Import Vault
	const handleExportVault = () => {
		if (savedAccounts.length === 0) {
			showToast("Vault is empty", "error")
			return
		}
		const dataStr =
			"data:text/json;charset=utf-8," +
			encodeURIComponent(JSON.stringify(savedAccounts, null, 2))
		const downloadAnchor = document.createElement("a")
		downloadAnchor.setAttribute("href", dataStr)
		downloadAnchor.setAttribute(
			"download",
			`SideDevTools_totp_vault_${Date.now()}.json`,
		)
		document.body.appendChild(downloadAnchor)
		downloadAnchor.click()
		downloadAnchor.remove()
		showToast("TOTP Vault exported as JSON", "info")
	}

	const handleImportVault = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = (event) => {
			try {
				const parsed = JSON.parse(event.target?.result as string)
				if (Array.isArray(parsed)) {
					setSavedAccounts((prev) => [...parsed, ...prev])
					showToast(`Imported ${parsed.length} accounts`, "success")
				}
			} catch {
				showToast("Invalid JSON file format", "error")
			}
		}
		reader.readAsText(file)
	}

	// Filtered saved accounts
	const filteredVault = useMemo(() => {
		const q = vaultSearch.toLowerCase().trim()
		if (!q) return savedAccounts
		return savedAccounts.filter(
			(a) =>
				a.label.toLowerCase().includes(q) ||
				a.issuer.toLowerCase().includes(q) ||
				a.secret.toLowerCase().includes(q),
		)
	}, [savedAccounts, vaultSearch])

	// SVG circle progress calculations
	const circleRadius = 14
	const circumference = 2 * Math.PI * circleRadius
	const strokeDashoffset = circumference * (1 - progressPercent / 100)
	const isUrgent = remainingSec <= 5

	const handleSurfaceDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsSurfaceDragging(true)
	}

	const handleSurfaceDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		if (e.currentTarget === e.target) {
			setIsSurfaceDragging(false)
		}
	}

	const handleSurfaceDrop = async (e: React.DragEvent) => {
		e.preventDefault()
		setIsSurfaceDragging(false)
		const file = e.dataTransfer.files?.[0]
		if (!file) return

		try {
			const result = await scanQrFromImageBlob(file)
			if (result) {
				const parsed = parseOtpAuthUri(result)
				applyParsedData(parsed)
				setActiveTab("authenticator")
				showToast("QR code detected from dropped image", "success")
			} else {
				showToast("No QR code found in dropped image", "error")
			}
		} catch {
			showToast("Failed to scan dropped image", "error")
		}
	}

	return (
		<div
			onDragOver={handleSurfaceDragOver}
			onDragLeave={handleSurfaceDragLeave}
			onDrop={handleSurfaceDrop}
			className={`relative flex-1 flex flex-col gap-3 p-3 transition-colors ${
				isSurfaceDragging ? "bg-[#008060]/5" : ""
			}`}
		>
			{/* Drag & Drop Visual Overlay when dragging file over surface */}
			{isSurfaceDragging && (
				<div className="absolute inset-2 z-40 rounded-lg border-2 border-dashed border-[#008060] bg-(--p-surface)/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center pointer-events-none animate-card-entrance shadow-xl">
					<UploadIcon
						size={32}
						className="text-[#008060] dark:text-[#34d399] mb-2"
					/>
					<p className="text-xs font-semibold text-(--p-text)">
						Drop QR Code Image Here
					</p>
					<p className="text-[10px] text-(--p-text-subdued) mt-0.5 max-w-xs">
						Release image file to automatically scan QR and
						configure 2FA token
					</p>
				</div>
			)}

			{/* Polaris Tabs Header (Matching Password Generator Pattern) */}
			<div className="flex items-center gap-1 p-0.5 bg-(--p-surface-subdued) border border-(--p-border) rounded-lg">
				<button
					onClick={() => setActiveTab("authenticator")}
					className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeTab === "authenticator"
							? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
							: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
					}`}
				>
					<QrCodeIcon size={16} />
					<span>Authenticator</span>
				</button>
				<button
					onClick={() => setActiveTab("vault")}
					className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeTab === "vault"
							? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
							: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
					}`}
				>
					<LockIcon size={16} />
					<span>Vault</span>
					{savedAccounts.length > 0 && (
						<span
							className={`text-[9px] px-1.5 py-0.2 rounded-lg tabular-nums ${
								activeTab === "vault"
									? "bg-white/20 text-white"
									: "bg-(--p-border) text-(--p-text-subdued)"
							}`}
						>
							{savedAccounts.length}
						</span>
					)}
				</button>
			</div>

			{activeTab === "authenticator" ? (
				/* Authenticator / Scanner Tab */
				<div className="flex-1 flex flex-col gap-3">
					{/* Live Token Card */}
					<div className="p-3 rounded-lg bg-(--p-surface) border border-(--p-border) shadow-xs flex flex-col gap-2.5 animate-card-entrance">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-1.5 overflow-hidden">
								<QrCodeIcon
									size={16}
									className="text-[#008060] dark:text-[#34d399] shrink-0"
								/>
								<div className="truncate">
									<span className="text-xs font-semibold text-(--p-text) truncate">
										{issuer ? `${issuer} ` : ""}
									</span>
									<span className="text-[11px] text-(--p-text-subdued) truncate">
										{label ? `(${label})` : ""}
									</span>
								</div>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<span
									className={`text-[11px] font-semibold tabular-nums ${
										isUrgent
											? "text-rose-500 animate-pulse"
											: "text-(--p-text-subdued)"
									}`}
								>
									{remainingSec}s
								</span>
								<div className="relative w-7 h-7 flex items-center justify-center">
									<svg
										className="w-7 h-7 -rotate-90"
										viewBox="0 0 36 36"
									>
										<circle
											cx="18"
											cy="18"
											r={circleRadius}
											fill="transparent"
											stroke="currentColor"
											strokeWidth="3"
											className="text-(--p-border)"
										/>
										<circle
											cx="18"
											cy="18"
											r={circleRadius}
											fill="transparent"
											stroke="currentColor"
											strokeWidth="3"
											strokeDasharray={circumference}
											strokeDashoffset={strokeDashoffset}
											strokeLinecap="round"
											className={`transition-all duration-300 ease-linear ${
												isUrgent
													? "text-rose-500"
													: "text-[#008060] dark:text-[#34d399]"
											}`}
										/>
									</svg>
								</div>
							</div>
						</div>

						{/* Big Code Display */}
						<div
							onClick={handleCopyCurrent}
							className="flex items-center justify-between p-3 rounded-lg bg-(--p-canvas) border border-(--p-border) hover:border-[#008060] transition-colors cursor-pointer group"
							title="Click to copy OTP code"
						>
							<div className="flex flex-col">
								<span className="text-[10px] uppercase font-semibold text-(--p-text-subdued) tracking-wider">
									Current OTP Code
								</span>
								<span className="font-mono text-2xl font-semibold tracking-wider text-(--p-text) tabular-nums group-hover:text-[#008060] dark:group-hover:text-[#34d399] transition-colors">
									{formattedCode}
								</span>
							</div>

							<div className="flex items-center gap-1.5">
								<button
									onClick={(e) => {
										e.stopPropagation()
										handleCopyCurrent()
									}}
									className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-(--p-surface) border border-(--p-border) text-xs text-(--p-text) hover:text-[#008060] dark:hover:text-[#34d399] transition-colors cursor-pointer shadow-xs"
								>
									{isCopied ? (
										<>
											<CheckIcon
												size={14}
												className="text-[#008060] dark:text-[#34d399]"
											/>
											<span className="font-medium text-[11px] text-[#008060] dark:text-[#34d399]">
												Copied
											</span>
										</>
									) : (
										<>
											<CopyIcon size={14} />
											<span className="font-medium text-[11px]">
												Copy
											</span>
										</>
									)}
								</button>

								<button
									onClick={(e) => {
										e.stopPropagation()
										handleOpenSaveModal()
									}}
									className="p-1.5 rounded-lg bg-(--p-surface) border border-(--p-border) text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] transition-colors cursor-pointer shadow-xs"
									title="Save to Vault"
								>
									<BookmarkIcon size={16} />
								</button>
							</div>
						</div>

						{/* Next Token & Period Info */}
						<div className="flex items-center justify-between text-[10px] text-(--p-text-subdued) px-0.5">
							<span>
								Next token:{" "}
								<code className="font-mono tabular-nums text-(--p-text)">
									{nextToken}
								</code>
							</span>
							<span>
								{period}s cycle • {digits} digits • {algorithm}
							</span>
						</div>
					</div>

					{/* Scan QR Code Toolbar */}
					<div className="p-2.5 rounded-lg bg-(--p-surface) border border-(--p-border) flex flex-col gap-2 shadow-xs">
						<div className="flex items-center justify-between text-[11px] font-semibold text-(--p-text)">
							<div className="flex items-center gap-1.5">
								<QrCodeIcon
									size={15}
									className="text-[#008060] dark:text-[#34d399]"
								/>
								<span>Scan QR Code</span>
							</div>
							<span className="text-[10px] text-(--p-text-subdued)">
								⌘V to paste image
							</span>
						</div>

						<div className="grid grid-cols-3 gap-1.5">
							{/* Drag-to-select region capture */}
							<Button
								size="xs"
								onClick={handleCaptureRegion}
								disabled={isCapturing}
								className="h-7 text-[11px] justify-center"
								title="Drag a box over part of the page to capture a QR code"
							>
								<MaximizeIcon
									size={14}
									className="text-[#008060] dark:text-[#34d399]"
								/>
								<span>
									{isCapturing ? "Capturing..." : "Capture"}
								</span>
							</Button>

							{/* File Upload */}
							<Button
								variant="secondary"
								size="xs"
								onClick={() => fileInputRef.current?.click()}
								className="h-7 text-[11px] justify-center"
								title="Upload image file with QR code"
							>
								<UploadIcon
									size={14}
									className="text-[#008060] dark:text-[#34d399]"
								/>
								<span>Upload</span>
							</Button>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								onChange={handleFileUpload}
								className="hidden"
							/>

							{/* Clipboard Paste */}
							<Button
								variant="secondary"
								size="xs"
								onClick={handleScanClipboard}
								className="h-7 text-[11px] justify-center"
								title="Scan image or otpauth text in clipboard"
							>
								<ClipboardIcon
									size={14}
									className="text-[#008060] dark:text-[#34d399]"
								/>
								<span>Paste</span>
							</Button>
						</div>
					</div>

					{/* Parameters Configuration Card */}
					<div className="p-3 rounded-lg bg-(--p-surface) border border-(--p-border) flex flex-col gap-2.5 shadow-xs">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-semibold text-(--p-text-subdued) uppercase tracking-wider">
								Account Parameters
							</span>
							<button
								onClick={() =>
									setSecret(generateRandomBase32())
								}
								className="flex items-center gap-1 text-[10px] text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] cursor-pointer transition-colors"
								title="Generate random Base32 secret for testing"
							>
								<RefreshIcon size={12} />
								<span>Random Secret</span>
							</button>
						</div>

						{/* Secret Input */}
						<div className="flex flex-col gap-1">
							<div className="flex items-center justify-between text-[11px]">
								<span className="text-(--p-text) font-medium">
									Secret Key (Base32)
								</span>
								{!isValidSecret && secret && (
									<span className="flex items-center gap-1 text-[10px] text-rose-500">
										<AlertIcon size={12} />
										Invalid Base32
									</span>
								)}
							</div>
							<div className="relative">
								<Input
									value={secret}
									onChange={(e) => setSecret(e.target.value)}
									placeholder="e.g. JBSWY3DPEHPK3PXP"
									className={`font-mono text-xs pr-7 uppercase tracking-wider ${
										!isValidSecret && secret
											? "border-rose-500 focus:border-rose-500"
											: ""
									}`}
								/>
								<div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-(--p-text-subdued)">
									<KeyIcon size={14} />
								</div>
							</div>
						</div>

						{/* Label & Issuer */}
						<div className="grid grid-cols-2 gap-2">
							<div className="flex flex-col gap-1">
								<span className="text-[11px] text-(--p-text) font-medium">
									Issuer
								</span>
								<Input
									value={issuer}
									onChange={(e) => setIssuer(e.target.value)}
									placeholder="Google, GitHub..."
									className="text-xs"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-[11px] text-(--p-text) font-medium">
									Label / Email
								</span>
								<Input
									value={label}
									onChange={(e) => setLabel(e.target.value)}
									placeholder="alice@gmail.com"
									className="text-xs"
								/>
							</div>
						</div>

						{/* Advanced Settings Toggle */}
						<button
							onClick={() => setShowAdvanced(!showAdvanced)}
							className="flex items-center justify-between pt-1 text-[11px] text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer transition-colors"
						>
							<span>Advanced (Algorithm, Digits, Period)</span>
							<ChevronDownIcon
								size={14}
								className={`transition-transform duration-200 ${
									showAdvanced ? "rotate-180" : ""
								}`}
							/>
						</button>

						{showAdvanced && (
							<div className="grid grid-cols-3 gap-2 pt-1 border-t border-(--p-border-subtle) animate-card-entrance">
								{/* Algorithm */}
								<div className="flex flex-col gap-1">
									<span className="text-[10px] text-(--p-text-subdued)">
										Algorithm
									</span>
									<select
										value={algorithm}
										onChange={(e) =>
											setAlgorithm(
												e.target.value as
													| "SHA1"
													| "SHA256"
													| "SHA512",
											)
										}
										className="h-7 px-2 rounded-lg border border-(--p-border) bg-(--p-surface) text-xs text-(--p-text) focus:outline-none focus:border-[#008060]"
									>
										<option value="SHA1">SHA-1</option>
										<option value="SHA256">SHA-256</option>
										<option value="SHA512">SHA-512</option>
									</select>
								</div>

								{/* Digits */}
								<div className="flex flex-col gap-1">
									<span className="text-[10px] text-(--p-text-subdued)">
										Digits
									</span>
									<select
										value={digits}
										onChange={(e) =>
											setDigits(
												parseInt(e.target.value, 10),
											)
										}
										className="h-7 px-2 rounded-lg border border-(--p-border) bg-(--p-surface) text-xs text-(--p-text) focus:outline-none focus:border-[#008060]"
									>
										<option value={6}>6 digits</option>
										<option value={8}>8 digits</option>
									</select>
								</div>

								{/* Period */}
								<div className="flex flex-col gap-1">
									<span className="text-[10px] text-(--p-text-subdued)">
										Period
									</span>
									<select
										value={period}
										onChange={(e) =>
											setPeriod(
												parseInt(e.target.value, 10),
											)
										}
										className="h-7 px-2 rounded-lg border border-(--p-border) bg-(--p-surface) text-xs text-(--p-text) focus:outline-none focus:border-[#008060]"
									>
										<option value={30}>30 sec</option>
										<option value={60}>60 sec</option>
									</select>
								</div>
							</div>
						)}
					</div>
				</div>
			) : (
				/* Vault Tab Content (Matching Password Generator Vault Pattern) */
				<div className="flex-1 flex flex-col gap-3">
					{/* Vault Search & Toolbar */}
					<div className="flex items-center gap-1.5">
						<div className="relative flex-1">
							<SearchIcon
								size={14}
								className="text-(--p-text-subdued) absolute left-2.5 top-2 pointer-events-none"
							/>
							<input
								type="text"
								value={vaultSearch}
								onChange={(e) => setVaultSearch(e.target.value)}
								placeholder="Search saved 2FA accounts..."
								className="w-full pl-7 pr-2 py-1 bg-(--p-surface) border border-(--p-border) rounded-lg text-xs text-(--p-text) placeholder:text-(--p-text-subdued) focus:outline-none focus:border-[#008060] transition-colors"
							/>
						</div>
						<button
							onClick={handleExportVault}
							title="Export Vault JSON"
							className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover) transition-colors cursor-pointer"
						>
							<DownloadIcon size={16} />
						</button>
						<label
							className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover) transition-colors cursor-pointer inline-flex items-center justify-center"
							title="Import Vault JSON"
						>
							<UploadIcon size={16} />
							<input
								ref={importInputRef}
								type="file"
								accept=".json"
								onChange={handleImportVault}
								className="hidden"
							/>
						</label>
					</div>

					{/* Vault Entries List */}
					{filteredVault.length === 0 ? (
						<div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-(--p-border) bg-(--p-surface)/50 animate-card-entrance my-auto">
							<LockIcon
								size={26}
								className="text-(--p-text-subdued) mb-2"
							/>
							<p className="text-xs font-semibold text-(--p-text)">
								{vaultSearch
									? "No matching accounts found"
									: "Your TOTP Vault is empty"}
							</p>
							<p className="text-[11px] text-(--p-text-subdued) mt-0.5 max-w-xs mb-3">
								{vaultSearch
									? "Try searching for a different issuer or label."
									: "Scan a QR code or save an account from the Authenticator tab."}
							</p>
							{!vaultSearch && (
								<Button
									variant="default"
									size="xs"
									onClick={() =>
										setActiveTab("authenticator")
									}
									className="px-3"
								>
									<QrCodeIcon size={14} />
									<span>Go to Authenticator</span>
								</Button>
							)}
						</div>
					) : (
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between text-[11px] text-(--p-text-subdued) px-0.5">
								<span className="font-semibold uppercase tracking-wider text-(--p-text-subdued)">
									Saved Accounts ({filteredVault.length})
								</span>
							</div>

							<div className="flex flex-col rounded-lg border border-(--p-border) bg-(--p-surface) divide-y divide-(--p-border-subtle) overflow-hidden shadow-xs">
								{filteredVault.map((acc) => {
									let accCode = "------"
									const accPeriod = acc.period || 30
									const accRemaining =
										accPeriod -
										(Math.floor(now / 1000) % accPeriod)
									try {
										const accTotp = new OTPAuth.TOTP({
											issuer: acc.issuer || undefined,
											label: acc.label || undefined,
											algorithm: acc.algorithm,
											digits: acc.digits,
											period: acc.period,
											secret: OTPAuth.Secret.fromBase32(
												acc.secret
													.replace(/[\s-]/g, "")
													.toUpperCase(),
											),
										})
										accCode = accTotp.generate({
											timestamp: now,
										})
									} catch {}

									const isThisCopied =
										copiedAccountId === acc.id
									const isSecretRevealed = Boolean(
										revealedSecrets[acc.id],
									)
									const formattedAccCode =
										accCode.length === 6
											? `${accCode.slice(0, 3)} ${accCode.slice(3)}`
											: accCode

									return (
										<div
											key={acc.id}
											className="group flex flex-col p-2.5 hover:bg-(--p-surface-hover) transition-colors gap-1.5"
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-1.5 overflow-hidden">
													<span className="text-xs font-semibold text-(--p-text) truncate">
														{acc.issuer ||
															acc.label}
													</span>
													{acc.issuer &&
														acc.label && (
															<span className="text-[10px] text-(--p-text-subdued) truncate">
																• {acc.label}
															</span>
														)}
												</div>

												<div className="flex items-center gap-1.5 shrink-0">
													<span
														className={`text-[10px] font-semibold tabular-nums ${
															accRemaining <= 5
																? "text-rose-500 animate-pulse"
																: "text-(--p-text-subdued)"
														}`}
													>
														{accRemaining}s
													</span>
													<span className="text-[9px] px-1 py-0.2 rounded bg-(--p-canvas) border border-(--p-border) text-(--p-text-subdued)">
														{acc.algorithm}
													</span>
												</div>
											</div>

											{/* Code & Actions Row */}
											<div className="flex items-center justify-between">
												<div className="flex flex-col">
													<span className="font-mono text-base font-semibold tracking-wider text-(--p-text) tabular-nums group-hover:text-[#008060] dark:group-hover:text-[#34d399] transition-colors">
														{formattedAccCode}
													</span>
													<span className="font-mono text-[10px] text-(--p-text-subdued) tracking-wider">
														{isSecretRevealed
															? acc.secret
															: "••••••••••••••••"}
													</span>
												</div>

												<div className="flex items-center gap-0 shrink-0">
													{/* Copy Code Button */}
													<button
														onClick={() =>
															handleCopyAccountToken(
																acc,
															)
														}
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] transition-colors cursor-pointer"
														title="Copy OTP Code"
													>
														{isThisCopied ? (
															<CheckIcon
																size={14}
																className="text-[#008060] dark:text-[#34d399]"
															/>
														) : (
															<CopyIcon
																size={14}
															/>
														)}
													</button>

													{/* Load in Authenticator */}
													<button
														onClick={() =>
															handleLoadAccount(
																acc,
															)
														}
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] transition-colors cursor-pointer"
														title="Load into Authenticator"
													>
														<ArrowLeftIcon
															size={14}
														/>
													</button>
													{/* Reveal Secret Button */}
													<button
														onClick={() =>
															setRevealedSecrets(
																(prev) => ({
																	...prev,
																	[acc.id]:
																		!prev[
																			acc
																				.id
																		],
																}),
															)
														}
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) transition-colors cursor-pointer"
														title={
															isSecretRevealed
																? "Hide Secret"
																: "Reveal Secret"
														}
													>
														{isSecretRevealed ? (
															<EyeOffIcon
																size={14}
															/>
														) : (
															<EyeIcon
																size={14}
															/>
														)}
													</button>

													{/* Delete Account */}
													<button
														onClick={() =>
															handleDeleteAccount(
																acc.id,
															)
														}
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-rose-500 transition-colors cursor-pointer"
														title="Delete Account"
													>
														<TrashIcon size={14} />
													</button>
												</div>
											</div>
										</div>
									)
								})}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Save to Vault Modal Dialog with Animated Exit & Entrance */}
			<Modal
				isOpen={isSaving}
				onClose={() => setIsSaving(false)}
				title="Save Account to Vault"
				icon={
					<BookmarkIcon
						size={16}
						className="text-[#008060] dark:text-[#34d399]"
					/>
				}
			>
				<form
					onSubmit={handleConfirmSave}
					className="flex flex-col gap-3"
				>
					<div className="flex flex-col gap-2 text-xs">
						<div className="flex flex-col gap-1">
							<span className="text-[11px] text-(--p-text) font-medium">
								Issuer / Organization
							</span>
							<Input
								value={saveIssuer}
								onChange={(e) => setSaveIssuer(e.target.value)}
								placeholder="e.g. GitHub, AWS, Google"
								className="text-xs"
								autoFocus
							/>
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-[11px] text-(--p-text) font-medium">
								Account / Email
							</span>
							<Input
								value={saveLabel}
								onChange={(e) => setSaveLabel(e.target.value)}
								placeholder="e.g. user@example.com"
								className="text-xs"
							/>
						</div>

						<div className="p-2 rounded-lg bg-(--p-canvas) border border-(--p-border) flex flex-col gap-0.5 text-[10px]">
							<span className="text-(--p-text-subdued)">
								Secret Key:
							</span>
							<span className="font-mono text-[11px] text-(--p-text) truncate">
								{cleanSecret}
							</span>
						</div>
					</div>

					<div className="flex items-center justify-end gap-2 pt-1 border-t border-(--p-border-subtle)">
						<Button
							type="button"
							variant="secondary"
							size="xs"
							onClick={() => setIsSaving(false)}
							className="px-3"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="default"
							size="xs"
							className="px-3"
						>
							Save Account
						</Button>
					</div>
				</form>
			</Modal>
		</div>
	)
}
