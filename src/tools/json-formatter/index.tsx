import {useState} from "react"
import {
	CopyIcon,
	TrashIcon,
	MaximizeIcon,
	MinimizeIcon,
	AlertIcon,
	SparklesIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {Textarea} from "@/components/ui/input"
import {useToast} from "@/components/ui/toast"

export function JsonFormatterView() {
	const [input, setInput] = useState("")
	const [output, setOutput] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [indent, setIndent] = useState<number>(2)
	const [isGeneratedAnim, setIsGeneratedAnim] = useState(false)
	const {showToast} = useToast()

	const handleFormat = () => {
		if (!input.trim()) return
		try {
			const parsed = JSON.parse(input)
			setOutput(JSON.stringify(parsed, null, indent))
			setError(null)
			setIsGeneratedAnim(true)
			setTimeout(() => setIsGeneratedAnim(false), 350)
			showToast("JSON formatted successfully", "success")
		} catch (err: any) {
			setError(err.message)
			setOutput("")
		}
	}

	const handleMinify = () => {
		if (!input.trim()) return
		try {
			const parsed = JSON.parse(input)
			setOutput(JSON.stringify(parsed))
			setError(null)
			setIsGeneratedAnim(true)
			setTimeout(() => setIsGeneratedAnim(false), 350)
			showToast("JSON minified", "success")
		} catch (err: any) {
			setError(err.message)
			setOutput("")
		}
	}

	const handleCopy = () => {
		if (!output) return
		navigator.clipboard.writeText(output)
		showToast("Copied to clipboard", "success")
	}

	const loadSample = () => {
		setInput(
			JSON.stringify(
				{
					app: "SideDevTools",
					tagline: "Privacy-First Developer Companion",
					version: "1.3.0",
					author: {
						name: "John Doe",
						email: "john@example.dev",
					},
					privacy: "100% offline & client-side",
					tools: [
						"TOTP Authenticator & QR Scanner",
						"AI Background Remover",
						"Any DateTime Parser",
						"Document to Markdown (AnyDoc)",
						"Password Generator & Vault",
						"Encode / Decode Suite",
						"JSON Formatter & Validator",
						"Universal ID Generator",
						"Hash & Checksum Generator",
					],
					config: {
						offlineOnly: true,
						telemetry: false,
						theme: "system",
					},
				},
				null,
				2,
			),
		)
		setError(null)
	}

	return (
		<div className="flex flex-col gap-3 p-3">
			<div className="flex items-center justify-between text-xs">
				<div className="flex items-center gap-1">
					<Button variant="default" size="xs" onClick={handleFormat}>
						<MaximizeIcon size={14} />
						<span>Format</span>
					</Button>
					<Button
						variant="secondary"
						size="xs"
						onClick={handleMinify}
					>
						<MinimizeIcon size={14} />
						<span>Minify</span>
					</Button>
					<Button
						variant="ghost"
						size="xs"
						onClick={loadSample}
						className="hover:text-[#008060] dark:hover:text-[#34d399]"
					>
						<SparklesIcon
							size={14}
							className="text-[#008060] dark:text-[#34d399]"
						/>
						<span>Sample</span>
					</Button>
				</div>

				<div className="flex items-center gap-1.5 text-[11px] text-(--p-text-subdued)">
					<span>Indent:</span>
					{[2, 4].map((n) => (
						<button
							key={n}
							onClick={() => setIndent(n)}
							className={`w-5 h-5 rounded-lg text-[10px] cursor-pointer transition-colors tabular-nums ${
								indent === n
									? "bg-[#008060] text-white font-semibold"
									: "bg-(--p-surface-subdued) text-(--p-text-subdued) hover:text-(--p-text)"
							}`}
						>
							{n}
						</button>
					))}
					<button
						onClick={() => {
							setInput("")
							setOutput("")
							setError(null)
						}}
						title="Clear"
						className="p-1 text-(--p-text-subdued) hover:text-[#f87171] transition-colors cursor-pointer"
					>
						<TrashIcon size={16} />
					</button>
				</div>
			</div>

			<div className="flex flex-col gap-1">
				<span className="text-[11px] font-semibold text-(--p-text-subdued) uppercase">
					Raw JSON Input
				</span>
				<Textarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Paste unformatted JSON here..."
					rows={18}
					className="text-[11px] font-mono"
				/>
			</div>

			{error && (
				<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[#2d1518] border border-[#522327] text-[#f87171] text-[11px]">
					<AlertIcon size={16} className="shrink-0 text-[#f87171]" />
					<span className="font-mono break-all">{error}</span>
				</div>
			)}

			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between text-[11px] text-(--p-text-subdued)">
					<span className="font-semibold uppercase">
						Formatted JSON
					</span>
					<button
						onClick={handleCopy}
						disabled={!output}
						className="p-1 text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
						title="Copy formatted JSON"
					>
						<CopyIcon size={14} />
						<span>Copy</span>
					</button>
				</div>
				<Textarea
					value={output}
					readOnly
					placeholder="Formatted result will appear here..."
					rows={18}
					className={`bg-(--p-surface) border-(--p-border) text-[11px] font-mono text-[#008060] dark:text-[#34d399] transition-all duration-200 ${
						isGeneratedAnim
							? "animate-text-generated border-[#008060]"
							: ""
					}`}
				/>
			</div>
		</div>
	)
}
