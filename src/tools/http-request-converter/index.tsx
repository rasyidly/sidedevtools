import {useState, useMemo} from "react"
import {
	CopyIcon,
	CheckIcon,
	TrashIcon,
	SparklesIcon,
	DocumentIcon,
	CodeIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {Textarea} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {useToast} from "@/components/ui/toast"
import {
	type HttpMethod,
	type TargetLanguage,
	SAMPLE_CURL,
	SAMPLE_FETCH,
	SAMPLE_AXIOS,
	parseAnyHttpRequest,
	convertRequest,
} from "./utils"

type ActiveTab = "converter" | "inspector"

export function HttpRequestConverterView() {
	const [rawInput, setRawInput] = useState<string>(SAMPLE_CURL)
	const [targetLang, setTargetLang] = useState<TargetLanguage>("fetch")
	const [activeTab, setActiveTab] = useState<ActiveTab>("converter")
	const [copied, setCopied] = useState(false)
	const {showToast} = useToast()

	// Parse input whenever rawInput changes
	const parsed = useMemo(() => {
		return parseAnyHttpRequest(rawInput)
	}, [rawInput])

	// Convert parsed to target language code
	const convertedCode = useMemo(() => {
		return convertRequest(parsed, targetLang)
	}, [parsed, targetLang])

	const handleCopy = async () => {
		if (!convertedCode) return
		try {
			await navigator.clipboard.writeText(convertedCode)
			setCopied(true)
			showToast("Copied to clipboard", "success")
			setTimeout(() => setCopied(false), 1800)
		} catch {
			showToast("Failed to copy to clipboard", "error")
		}
	}

	const handlePasteClipboard = async () => {
		try {
			const text = await navigator.clipboard.readText()
			if (text) {
				setRawInput(text)
				showToast("Pasted from clipboard", "success")
			}
		} catch {
			showToast("Clipboard access denied or empty", "error")
		}
	}

	const targetLanguages: {id: TargetLanguage; label: string}[] = [
		{id: "fetch", label: "Fetch"},
		{id: "axios", label: "Axios"},
		{id: "curl", label: "cURL"},
		{id: "python-requests", label: "Python"},
		{id: "golang", label: "Go"},
		{id: "rust", label: "Rust"},
		{id: "php", label: "PHP"},
	]

	const methodBadges: Record<HttpMethod, string> = {
		GET: "bg-[#008060]/10 text-[#008060] dark:text-[#34d399] border-[#008060]/20",
		POST: "bg-[#2563eb]/10 text-[#2563eb] dark:text-[#60a5fa] border-[#2563eb]/20",
		PUT: "bg-[#d97706]/10 text-[#d97706] dark:text-[#fbbf24] border-[#d97706]/20",
		PATCH: "bg-[#8b5cf6]/10 text-[#8b5cf6] dark:text-[#a78bfa] border-[#8b5cf6]/20",
		DELETE: "bg-[#dc2626]/10 text-[#dc2626] dark:text-[#f87171] border-[#dc2626]/20",
		HEAD: "bg-gray-500/10 text-gray-500 border-gray-500/20",
		OPTIONS: "bg-gray-500/10 text-gray-500 border-gray-500/20",
	}

	return (
		<div className="flex-1 flex flex-col gap-3 p-3">
			{/* Presets Bar & Quick Actions (Matches JSON Formatter action bar pattern) */}
			<div className="flex items-center justify-between text-xs">
				<div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
					<span className="text-[11px] text-(--p-text-subdued) font-medium shrink-0 mr-0.5">
						Presets:
					</span>
					<button
						onClick={() => setRawInput(SAMPLE_CURL)}
						className="px-2 py-0.5 rounded-lg text-[10px] bg-(--p-surface-subdued) border border-(--p-border) hover:bg-(--p-surface-hover) text-(--p-text) cursor-pointer whitespace-nowrap transition-colors"
					>
						cURL
					</button>
					<button
						onClick={() => setRawInput(SAMPLE_FETCH)}
						className="px-2 py-0.5 rounded-lg text-[10px] bg-(--p-surface-subdued) border border-(--p-border) hover:bg-(--p-surface-hover) text-(--p-text) cursor-pointer whitespace-nowrap transition-colors"
					>
						Fetch
					</button>
					<button
						onClick={() => setRawInput(SAMPLE_AXIOS)}
						className="px-2 py-0.5 rounded-lg text-[10px] bg-(--p-surface-subdued) border border-(--p-border) hover:bg-(--p-surface-hover) text-(--p-text) cursor-pointer whitespace-nowrap transition-colors"
					>
						Axios
					</button>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					<Button
						variant="secondary"
						size="xs"
						onClick={handlePasteClipboard}
						title="Paste snippet from clipboard"
					>
						Paste
					</Button>
					<button
						onClick={() => setRawInput("")}
						disabled={!rawInput}
						title="Clear input"
						className="p-1 text-(--p-text-subdued) hover:text-[#f87171] transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
					>
						<TrashIcon size={16} />
					</button>
				</div>
			</div>

			{/* Input Request Block */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<span className="text-[11px] font-semibold text-(--p-text-subdued) uppercase tracking-wider">
						Raw HTTP Request / Snippet
					</span>
					{parsed.url && (
						<div className="flex items-center gap-1.5 overflow-hidden">
							<span
								className={`px-1.5 py-0.2 rounded-lg text-[9px] font-semibold border ${methodBadges[parsed.method] || "text-(--p-text)"}`}
							>
								{parsed.method}
							</span>
							<span className="text-[10px] text-(--p-text-subdued) max-w-[130px] truncate">
								{parsed.url.replace(/^https?:\/\//, "")}
							</span>
						</div>
					)}
				</div>

				<Textarea
					value={rawInput}
					onChange={(e) => setRawInput(e.target.value)}
					placeholder="Paste cURL command, fetch() snippet, axios call, or HTTP request..."
					className="font-mono text-[11px] leading-relaxed resize-y"
					rows={12}
				/>
			</div>
			{/* Polaris Segmented Tabs (Matches Password Generator & Meta/OG pattern) */}
			<div className="flex items-center gap-1 p-0.5 bg-(--p-surface-subdued) border border-(--p-border) rounded-lg">
				<button
					onClick={() => setActiveTab("converter")}
					className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeTab === "converter"
							? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
							: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
					}`}
				>
					<SparklesIcon size={15} />
					<span>Convert Code</span>
				</button>
				<button
					onClick={() => setActiveTab("inspector")}
					className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeTab === "inspector"
							? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
							: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
					}`}
				>
					<DocumentIcon size={15} />
					<span>Structure</span>
					{Object.keys(parsed.headers).length > 0 && (
						<span
							className={`text-[9px] px-1.5 py-0.2 rounded-lg tabular-nums ${
								activeTab === "inspector"
									? "bg-white/20 text-white font-semibold"
									: "bg-(--p-border) text-(--p-text)"
							}`}
						>
							{Object.keys(parsed.headers).length}
						</span>
					)}
				</button>
			</div>

			{/* TAB 1: CONVERT CODE */}
			{activeTab === "converter" && (
				<div className="flex flex-col gap-2.5 animate-card-entrance">
					{/* Target Language Segmented Bar */}
					<div className="flex flex-col gap-1.5">
						<span className="text-[11px] font-semibold text-(--p-text-subdued) uppercase tracking-wider">
							Target Language
						</span>
						<div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
							{targetLanguages.map((t) => (
								<button
									key={t.id}
									onClick={() => setTargetLang(t.id)}
									className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer transition-all border ${
										targetLang === t.id
											? "bg-[#008060]! text-white border-[#005e46] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
											: "bg-(--p-surface) text-(--p-text-subdued) border-(--p-border) hover:bg-(--p-surface-hover) hover:text-(--p-text)"
									}`}
								>
									{t.label}
								</button>
							))}
						</div>
					</div>

					{/* Output Code Container */}
					<div className="flex flex-col rounded-lg border border-(--p-border) bg-(--p-surface-subdued) overflow-hidden shadow-xs">
						<div className="flex items-center justify-between px-3 py-2 bg-(--p-surface-subdued) border-b border-(--p-border)">
							<span className="text-xs font-semibold text-(--p-text)">
								Generated{" "}
								{
									targetLanguages.find(
										(l) => l.id === targetLang,
									)?.label
								}{" "}
								Code
							</span>

							<Button
								variant={copied ? "default" : "secondary"}
								size="xs"
								onClick={handleCopy}
								className="h-6 text-[10px] px-2.5"
							>
								{copied ? (
									<>
										<CheckIcon
											size={12}
											className="text-white"
										/>
										<span>Copied</span>
									</>
								) : (
									<>
										<CopyIcon size={12} />
										<span>Copy Code</span>
									</>
								)}
							</Button>
						</div>

						<pre className="p-3 text-[11px] font-mono leading-relaxed text-(--p-text) bg-(--p-surface) overflow-x-auto selection:bg-[#008060]/20 selection:text-(--p-text) h-full">
							<code>{convertedCode}</code>
						</pre>
					</div>
				</div>
			)}

			{/* TAB 2: PARSED STRUCTURE */}
			{activeTab === "inspector" && (
				<div className="flex flex-col gap-3 animate-card-entrance">
					{/* Endpoint Details Card */}
					<div className="p-3 rounded-lg border border-(--p-border) bg-(--p-surface) flex flex-col gap-1.5 shadow-xs">
						<span className="text-[11px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
							Target Endpoint
						</span>
						<div className="flex items-center gap-2">
							<span
								className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${methodBadges[parsed.method] || ""}`}
							>
								{parsed.method}
							</span>
							<span className="font-mono text-xs text-(--p-text) break-all select-text">
								{parsed.url}
							</span>
						</div>
					</div>

					{/* Headers Card */}
					<div className="flex flex-col rounded-lg border border-(--p-border) bg-(--p-surface) overflow-hidden shadow-xs">
						<div className="flex items-center justify-between px-3 py-2 bg-(--p-surface-subdued) border-b border-(--p-border)">
							<span className="text-xs font-semibold text-(--p-text)">
								Request Headers
							</span>
							<Badge variant="secondary">
								{Object.keys(parsed.headers).length}
							</Badge>
						</div>

						{Object.keys(parsed.headers).length === 0 ? (
							<div className="p-6 text-center text-xs text-(--p-text-subdued) italic">
								No custom headers present
							</div>
						) : (
							<div className="divide-y divide-(--p-border-subtle) text-[11px] font-mono">
								{Object.entries(parsed.headers).map(
									([key, val]) => (
										<div
											key={key}
											className="flex items-start justify-between p-2.5 hover:bg-(--p-surface-hover) transition-colors"
										>
											<span className="text-[#008060] dark:text-[#34d399] font-medium shrink-0 max-w-[130px] truncate select-text">
												{key}:
											</span>
											<span className="text-(--p-text) select-text break-all text-right pl-2">
												{val}
											</span>
										</div>
									),
								)}
							</div>
						)}
					</div>

					{/* Body Card */}
					<div className="flex flex-col rounded-lg border border-(--p-border) bg-(--p-surface) overflow-hidden shadow-xs">
						<div className="flex items-center justify-between px-3 py-2 bg-(--p-surface-subdued) border-b border-(--p-border)">
							<span className="text-xs font-semibold text-(--p-text)">
								Request Body
							</span>
							{parsed.body && (
								<span className="text-[10px] text-(--p-text-subdued) tabular-nums">
									{parsed.body.length} chars
								</span>
							)}
						</div>

						{parsed.body ? (
							<pre className="p-3 font-mono text-[11px] text-(--p-text) bg-(--p-canvas) overflow-x-auto max-h-[180px] select-text">
								{parsed.body}
							</pre>
						) : (
							<div className="p-6 text-center text-xs text-(--p-text-subdued) italic">
								No body attached to this request
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
