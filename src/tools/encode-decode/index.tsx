import React, {useState, useEffect} from "react"
import {
	SwapIcon,
	CopyIcon,
	TrashIcon,
	CheckIcon,
	AlertIcon,
	HistoryIcon,
	KeyIcon,
	SparklesIcon,
	CodeIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {Textarea} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {Switch} from "@/components/ui/switch"
import {useToast} from "@/components/ui/toast"
import {
	utf8ToBase64,
	base64ToUtf8,
	encodeHtmlEntities,
	decodeHtmlEntities,
	textToHex,
	hexToText,
	decodeJWT,
} from "./utils"
import type {DecodedJWT} from "./utils"

type EncodeType = "base64" | "url" | "jwt" | "html" | "hex"

export function EncodeDecodeView() {
	const [type, setType] = useState<EncodeType>("base64")
	const [direction, setDirection] = useState<"encode" | "decode">("encode")
	const [input, setInput] = useState("")
	const [output, setOutput] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [urlSafeBase64, setUrlSafeBase64] = useState(false)
	const [jwtData, setJwtData] = useState<DecodedJWT | null>(null)
	const [copied, setCopied] = useState(false)
	const [isGeneratedAnim, setIsGeneratedAnim] = useState(false)
	const {showToast} = useToast()

	// Process conversion automatically when input or settings change
	useEffect(() => {
		setError(null)
		setJwtData(null)

		if (!input.trim()) {
			setOutput("")
			return
		}

		try {
			if (type === "base64") {
				if (direction === "encode") {
					setOutput(utf8ToBase64(input, urlSafeBase64))
				} else {
					setOutput(base64ToUtf8(input))
				}
			} else if (type === "url") {
				if (direction === "encode") {
					setOutput(encodeURIComponent(input))
				} else {
					setOutput(decodeURIComponent(input))
				}
			} else if (type === "html") {
				if (direction === "encode") {
					setOutput(encodeHtmlEntities(input))
				} else {
					setOutput(decodeHtmlEntities(input))
				}
			} else if (type === "hex") {
				if (direction === "encode") {
					setOutput(textToHex(input))
				} else {
					setOutput(hexToText(input))
				}
			} else if (type === "jwt") {
				const decoded = decodeJWT(input)
				setJwtData(decoded)
				setOutput(JSON.stringify(decoded.payload, null, 2))
			}

			setIsGeneratedAnim(true)
			const t = setTimeout(() => setIsGeneratedAnim(false), 300)
			return () => clearTimeout(t)
		} catch (err: any) {
			setError(err.message || "Error processing input data")
			setOutput("")
		}
	}, [input, type, direction, urlSafeBase64])

	const handleCopy = (text: string) => {
		if (!text) return
		navigator.clipboard.writeText(text)
		setCopied(true)
		showToast("Copied to clipboard", "success")
		setTimeout(() => setCopied(false), 1500)
	}

	const handleSwap = () => {
		if (type === "jwt") return
		const currentOut = output
		setDirection((prev) => (prev === "encode" ? "decode" : "encode"))
		if (currentOut) {
			setInput(currentOut)
		}
	}

	const handleClear = () => {
		setInput("")
		setOutput("")
		setError(null)
		setJwtData(null)
	}

	const loadSample = () => {
		if (type === "base64") {
			setInput(
				"SideDevTools: Fast, privacy-first offline developer companion 🚀",
			)
			setDirection("encode")
		} else if (type === "url") {
			setInput(
				"https://github.com/rasyidly/sidedevtools?tab=readme-ov-file&ref=SideDevTools&version=1.2.0",
			)
			setDirection("encode")
		} else if (type === "jwt") {
			setInput(
				"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6InJhc3lpZGx5IiwiZW1haWwiOiJyYXN5aWRAc2VrZWNvLmlkIiwicm9sZSI6ImRldmVsb3BlciIsImV4cCI6MTc4OTEyMzQ1NiwiaWF0IjoxNzE5MjQwMDAwfQ.somerandomsignaturestringfortestingpurpose",
			)
		} else if (type === "html") {
			setInput(
				'<div class="dev-badge" data-privacy="offline">SideDevTools &middot; "Code with confidence" &lt;sandbox&gt;</div>',
			)
			setDirection("encode")
		} else if (type === "hex") {
			setInput("SideDevTools Privacy-First Developer Companion")
			setDirection("encode")
		}
	}

	// Parse URL query params if type is url and string contains query
	const queryParams = React.useMemo(() => {
		if (type !== "url" || !input) return null
		try {
			const url = input.startsWith("http")
				? new URL(input)
				: new URL("http://local/" + input.replace(/^\?/, ""))
			const entries = Array.from(url.searchParams.entries())
			return entries.length > 0 ? entries : null
		} catch {
			return null
		}
	}, [type, input])

	return (
		<div className="flex flex-col gap-3 p-3">
			{/* Type navigation tabs */}
			<div className="grid grid-cols-5 gap-1 p-0.5 bg-(--p-surface-subdued) border border-(--p-border) rounded-lg">
				{(["base64", "url", "jwt", "html", "hex"] as EncodeType[]).map(
					(t) => (
						<button
							key={t}
							onClick={() => {
								setType(t)
								setError(null)
							}}
							className={`py-1 text-center font-medium uppercase text-[11px] rounded-lg transition-all cursor-pointer ${
								type === t
									? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
									: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
							}`}
						>
							{t}
						</button>
					),
				)}
			</div>

			{/* Mode Toolbar: Encode / Decode / Swap */}
			<div className="flex items-center justify-between gap-1 text-xs">
				{type !== "jwt" ? (
					<div className="flex items-center bg-(--p-surface-subdued) border border-(--p-border) rounded-lg p-0.5">
						<button
							onClick={() => setDirection("encode")}
							className={`px-2 py-0.5 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${
								direction === "encode"
									? "bg-(--p-surface) text-[#008060] dark:text-[#34d399] font-semibold shadow-xs"
									: "text-(--p-text-subdued) hover:text-(--p-text)"
							}`}
						>
							Encode
						</button>
						<button
							onClick={() => setDirection("decode")}
							className={`px-2 py-0.5 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${
								direction === "decode"
									? "bg-(--p-surface) text-[#008060] dark:text-[#34d399] font-semibold shadow-xs"
									: "text-(--p-text-subdued) hover:text-(--p-text)"
							}`}
						>
							Decode
						</button>
					</div>
				) : (
					<div className="flex items-center gap-1.5 text-(--p-text)">
						<KeyIcon size={16} className="text-[#fbbf24]" />
						<span className="font-medium text-[11px]">
							JWT Token Claims
						</span>
					</div>
				)}

				{/* Options like URL-Safe */}
				{type === "base64" && (
					<label className="flex items-center gap-1.5 text-[11px] text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer select-none">
						<Switch
							size="sm"
							checked={urlSafeBase64}
							onCheckedChange={setUrlSafeBase64}
						/>
						<span>URL-safe</span>
					</label>
				)}

				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="xs"
						onClick={loadSample}
						title="Load sample input"
						className="text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399]"
					>
						<SparklesIcon
							size={14}
							className="text-[#008060] dark:text-[#34d399]"
						/>
						<span>Sample</span>
					</Button>

					{type !== "jwt" && (
						<button
							onClick={handleSwap}
							title="Swap Input & Output"
							className="p-1 text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover) rounded-lg transition-colors cursor-pointer"
						>
							<SwapIcon size={16} />
						</button>
					)}

					<button
						onClick={handleClear}
						title="Clear textareas"
						className="p-1 text-(--p-text-subdued) hover:text-[#f87171] hover:bg-(--p-surface-hover) rounded-lg transition-colors cursor-pointer"
					>
						<TrashIcon size={16} />
					</button>
				</div>
			</div>

			{/* Input Field */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between text-[11px] text-(--p-text-subdued) px-0.5">
					<span className="font-semibold uppercase tracking-wider text-(--p-text-subdued)">
						{type === "jwt"
							? "Raw JWT Token"
							: direction === "encode"
								? "Input Text"
								: "Encoded Input"}
					</span>
					<span className="text-[10px] tabular-nums text-(--p-text-subdued)">
						{input.length} chars
					</span>
				</div>
				<Textarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder={
						type === "jwt"
							? "Paste JWT token string (e.g. eyJhbGciOi...)"
							: direction === "encode"
								? "Type or paste plain text to encode..."
								: "Paste encoded data to decode..."
					}
					rows={8}
					className="text-[11px] leading-relaxed font-mono"
				/>
			</div>

			{/* Error display */}
			{error && (
				<div className="flex items-center gap-1.5 p-2 rounded-lg bg-[#2d1518] border border-[#522327] text-[#f87171] text-[11px]">
					<AlertIcon size={15} className="shrink-0 text-[#f87171]" />
					<span className="truncate">{error}</span>
				</div>
			)}

			{/* JWT Specific Metadata */}
			{jwtData && (
				<div className="flex flex-col gap-2 rounded-lg border border-(--p-border) bg-(--p-surface) p-2.5 text-xs animate-card-entrance">
					<div className="flex items-center justify-between pb-2">
						<span className="font-semibold text-(--p-text) text-[11px]">
							Token Metadata
						</span>
						{jwtData.isExpired !== undefined && (
							<Badge
								variant={
									jwtData.isExpired ? "critical" : "success"
								}
							>
								{jwtData.isExpired ? "Expired" : "Active"}
							</Badge>
						)}
					</div>

					<div className="grid grid-cols-2 gap-2 text-[10px] text-(--p-text-subdued) tabular-nums">
						{jwtData.expiresAt && (
							<div className="flex items-center gap-1 truncate">
								<HistoryIcon
									size={13}
									className="text-[#fbbf24] shrink-0"
								/>
								<span className="truncate">
									Exp: {jwtData.expiresAt}
								</span>
							</div>
						)}
						{jwtData.issuedAt && (
							<div className="flex items-center gap-1 truncate">
								<HistoryIcon
									size={13}
									className="text-[#60a5fa] shrink-0"
								/>
								<span className="truncate">
									Iat: {jwtData.issuedAt}
								</span>
							</div>
						)}
					</div>

					<div className="space-y-1 mt-1">
						<div className="text-[10px] font-semibold uppercase text-(--p-text-subdued)">
							Header
						</div>
						<pre className="p-1.5 rounded-lg bg-(--p-canvas) border border-(--p-border) font-mono text-[10px] text-[#008060] dark:text-[#34d399] overflow-x-auto">
							{JSON.stringify(jwtData.header, null, 2)}
						</pre>
					</div>
				</div>
			)}

			{/* Output Field with Generation Flash Animation */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between text-[11px] text-(--p-text-subdued) px-0.5">
					<span className="font-semibold uppercase tracking-wider text-(--p-text-subdued)">
						{type === "jwt"
							? "Decoded Payload"
							: direction === "encode"
								? "Encoded Output"
								: "Decoded Result"}
					</span>
					<div className="flex items-center gap-1">
						<span className="text-[10px] tabular-nums text-(--p-text-subdued) mr-1">
							{output.length} chars
						</span>
						<button
							onClick={() => handleCopy(output)}
							disabled={!output}
							className="p-1 text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
							title="Copy output"
						>
							{copied ? (
								<CheckIcon
									size={14}
									className="text-[#008060] dark:text-[#34d399]"
								/>
							) : (
								<CopyIcon size={14} />
							)}
							<span>{copied ? "Copied" : "Copy"}</span>
						</button>
					</div>
				</div>
				<Textarea
					value={output}
					readOnly
					placeholder="Output will appear here automatically..."
					rows={12}
					className={`bg-(--p-surface) border-(--p-border) text-[11px] leading-relaxed font-mono text-[#008060] dark:text-[#34d399] transition-all duration-200 ${
						isGeneratedAnim
							? "animate-text-generated border-[#008060]"
							: ""
					}`}
				/>
			</div>

			{/* URL Query Parameters Table */}
			{queryParams && (
				<div className="flex flex-col gap-1.5 rounded-lg border border-(--p-border) bg-(--p-surface) p-2 text-xs animate-card-entrance">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-semibold text-(--p-text) flex items-center gap-1">
							<CodeIcon
								size={15}
								className="text-[#008060] dark:text-[#34d399]"
							/>
							<span>Parsed Query Params</span>
						</span>
						<Badge variant="info" className="tabular-nums">
							{queryParams.length} params
						</Badge>
					</div>
					<div className="max-h-36 overflow-y-auto space-y-1 mt-1 pr-1">
						{queryParams.map(([key, val], idx) => (
							<div
								key={idx}
								className="flex items-center justify-between gap-1.5 p-1 rounded-lg bg-(--p-canvas) border border-(--p-border) text-[10px]"
							>
								<div className="flex items-baseline gap-1.5 overflow-hidden">
									<span className="font-semibold text-[#008060] dark:text-[#34d399] shrink-0">
										{key}:
									</span>
									<span className="text-(--p-text) truncate">
										{val}
									</span>
								</div>
								<button
									onClick={() => handleCopy(val)}
									className="text-(--p-text-subdued) hover:text-(--p-text) p-0.5 shrink-0 cursor-pointer"
									title="Copy value"
								>
									<CopyIcon size={14} />
								</button>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
