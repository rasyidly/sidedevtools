import {useState, useEffect, useCallback} from "react"
import {
	RefreshIcon,
	CopyIcon,
	CheckIcon,
	DownloadIcon,
} from "@/components/ui/solar-icon"
import {v4 as uuidv4, v7 as uuidv7} from "uuid"
import {ulid} from "ulid"
import {nanoid} from "nanoid"
import {createId as cuid2} from "@paralleldrive/cuid2"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Switch} from "@/components/ui/switch"
import {useToast} from "@/components/ui/toast"

export type IdType =
	| "uuidv4"
	| "uuidv7"
	| "ulid"
	| "nanoid"
	| "cuid2"
	| "timestamp"

export function IdGeneratorView() {
	const [type, setType] = useState<IdType>("uuidv4")
	const [count, setCount] = useState<number>(5)
	const [uppercase, setUppercase] = useState<boolean>(false)
	const [noHyphens, setNoHyphens] = useState<boolean>(false)
	const [prefix, setPrefix] = useState<string>("")
	const [suffix, setSuffix] = useState<string>("")
	const [nanoidLength, setNanoidLength] = useState<number>(21)
	const [results, setResults] = useState<string[]>([])
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
	const [copiedAll, setCopiedAll] = useState<boolean>(false)
	const [isGeneratedAnim, setIsGeneratedAnim] = useState(false)

	const {showToast} = useToast()

	const generateSingleId = useCallback((): string => {
		let id = ""
		switch (type) {
			case "uuidv4":
				id = uuidv4()
				if (noHyphens) id = id.replace(/-/g, "")
				break
			case "uuidv7":
				id = uuidv7()
				if (noHyphens) id = id.replace(/-/g, "")
				break
			case "ulid":
				id = ulid()
				break
			case "nanoid":
				id = nanoid(nanoidLength)
				break
			case "cuid2":
				id = cuid2()
				break
			case "timestamp":
				id = Date.now().toString()
				break
			default:
				id = uuidv4()
		}

		if (uppercase) {
			id = id.toUpperCase()
		} else {
			id = id.toLowerCase()
		}

		if (prefix) id = `${prefix}${id}`
		if (suffix) id = `${id}${suffix}`

		return id
	}, [type, noHyphens, uppercase, prefix, suffix, nanoidLength])

	const generateIds = useCallback(() => {
		const list: string[] = []
		for (let i = 0; i < count; i++) {
			list.push(generateSingleId())
		}
		setResults(list)

		// Trigger subtle generation feedback animation
		setIsGeneratedAnim(true)
		setTimeout(() => setIsGeneratedAnim(false), 350)
	}, [count, generateSingleId])

	// Generate on initial render or when type changes
	useEffect(() => {
		generateIds()
	}, [generateIds])

	const handleCopySingle = (id: string, index: number) => {
		navigator.clipboard.writeText(id)
		setCopiedIndex(index)
		showToast(`Copied to clipboard`, "success")
		setTimeout(() => setCopiedIndex(null), 1200)
	}

	const handleCopyAll = () => {
		if (results.length === 0) return
		navigator.clipboard.writeText(results.join("\n"))
		setCopiedAll(true)
		showToast(`${results.length} IDs copied`, "success")
		setTimeout(() => setCopiedAll(false), 1500)
	}

	const handleCopyJson = () => {
		if (results.length === 0) return
		navigator.clipboard.writeText(JSON.stringify(results, null, 2))
		showToast(`Copied as JSON array`, "success")
	}

	const handleDownload = () => {
		if (results.length === 0) return
		const blob = new Blob([results.join("\n")], {type: "text/plain"})
		const url = URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.href = url
		a.download = `${type}_ids_${Date.now()}.txt`
		a.click()
		URL.revokeObjectURL(url)
		showToast(`Downloaded text file`, "info")
	}

	return (
		<div className="flex flex-col gap-3 p-3">
			{/* Type Selector Pills */}
			<div className="grid grid-cols-3 gap-1 p-0.5 bg-(--p-surface-subdued) border border-(--p-border) rounded-lg">
				{[
					{id: "uuidv4", label: "UUID v4", desc: "Random"},
					{id: "uuidv7", label: "UUID v7", desc: "Time-sorted"},
					{id: "ulid", label: "ULID", desc: "Lexical"},
					{id: "nanoid", label: "NanoID", desc: "Compact"},
					{id: "cuid2", label: "CUID2", desc: "Collision-safe"},
					{id: "timestamp", label: "Timestamp", desc: "Epoch ms"},
				].map((item) => (
					<button
						key={item.id}
						onClick={() => setType(item.id as IdType)}
						className={`flex flex-col items-center py-1.5 px-1 rounded-lg text-center cursor-pointer transition-all ${
							type === item.id
								? "bg-[#008060] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
								: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
						}`}
					>
						<span className="text-[11px] leading-tight">
							{item.label}
						</span>
						<span className="text-[9px] opacity-75 leading-tight">
							{item.desc}
						</span>
					</button>
				))}
			</div>

			{/* Options Panel (Polaris Card) */}
			<div className="p-3 rounded-lg border border-(--p-border) bg-(--p-surface) flex flex-col gap-2.5">
				<div className="flex items-center justify-between text-[11px]">
					<span className="text-(--p-text-subdued) font-medium">
						Batch Quantity
					</span>
					<div className="flex items-center gap-1">
						{[1, 5, 10, 20].map((n) => (
							<button
								key={n}
								onClick={() => setCount(n)}
								className={`w-6 h-5 rounded-lg text-[10px] font-medium cursor-pointer transition-colors tabular-nums ${
									count === n
										? "bg-[#008060] text-white font-semibold"
										: "bg-(--p-surface-subdued) text-(--p-text-subdued) hover:text-(--p-text)"
								}`}
							>
								{n}
							</button>
						))}
					</div>
				</div>

				{/* Custom NanoID Length if NanoID selected */}
				{type === "nanoid" && (
					<div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-(--p-border-subtle)">
						<span className="text-(--p-text-subdued)">
							Length (
							<span className="tabular-nums">{nanoidLength}</span>
							)
						</span>
						<div className="flex items-center gap-1">
							{[8, 12, 16, 21, 32].map((len) => (
								<button
									key={len}
									onClick={() => setNanoidLength(len)}
									className={`px-1.5 h-5 rounded-lg text-[10px] cursor-pointer tabular-nums ${
										nanoidLength === len
											? "bg-[#008060] text-white font-semibold"
											: "bg-(--p-surface-subdued) text-(--p-text-subdued) hover:text-(--p-text)"
									}`}
								>
									{len}
								</button>
							))}
						</div>
					</div>
				)}

				{/* Toggles: Uppercase / No Hyphens */}
				<div className="flex items-center justify-between gap-3 pt-1.5 border-t border-(--p-border-subtle) text-[11px]">
					<label className="flex items-center gap-1.5 text-(--p-text) hover:text-[#008060] dark:hover:text-[#34d399] cursor-pointer select-none transition-colors">
						<Switch
							size="sm"
							checked={uppercase}
							onCheckedChange={setUppercase}
						/>
						<span className="font-medium text-[11px]">
							Uppercase
						</span>
					</label>

					{(type === "uuidv4" || type === "uuidv7") && (
						<label className="flex items-center gap-1.5 text-(--p-text) hover:text-[#008060] dark:hover:text-[#34d399] cursor-pointer select-none transition-colors">
							<Switch
								size="sm"
								checked={noHyphens}
								onCheckedChange={setNoHyphens}
							/>
							<span className="font-medium text-[11px]">
								No Hyphens
							</span>
						</label>
					)}
				</div>

				{/* Prefix & Suffix */}
				<div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-(--p-border-subtle)">
					<div className="flex items-center gap-1">
						<span className="text-[10px] text-(--p-text-subdued) font-medium">
							Prefix:
						</span>
						<Input
							value={prefix}
							onChange={(e) => setPrefix(e.target.value)}
							placeholder="e.g. usr_"
							className="h-6 text-[10px] px-1.5"
						/>
					</div>
					<div className="flex items-center gap-1">
						<span className="text-[10px] text-(--p-text-subdued) font-medium">
							Suffix:
						</span>
						<Input
							value={suffix}
							onChange={(e) => setSuffix(e.target.value)}
							placeholder="e.g. _v1"
							className="h-6 text-[10px] px-1.5"
						/>
					</div>
				</div>
			</div>

			{/* Action Bar */}
			<div className="flex items-center justify-between gap-1">
				<Button
					variant="default"
					size="sm"
					onClick={generateIds}
					className="flex-1 text-xs"
				>
					<RefreshIcon
						size={14}
						className={isGeneratedAnim ? "animate-spin" : ""}
					/>
					<span>Generate New</span>
				</Button>

				<Button
					variant="secondary"
					size="sm"
					onClick={handleCopyAll}
					title="Copy all IDs newline separated"
				>
					{copiedAll ? (
						<CheckIcon
							size={14}
							className="text-[#008060] dark:text-[#34d399]"
						/>
					) : (
						<CopyIcon size={14} />
					)}
					<span>{copiedAll ? "Copied" : "Copy All"}</span>
				</Button>

				<button
					onClick={handleCopyJson}
					title="Copy as JSON array"
					className="px-2 py-1.5 text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover) rounded-lg transition-colors cursor-pointer font-mono text-[11px] font-semibold"
				>
					{"[]"}
				</button>

				<button
					onClick={handleDownload}
					title="Download as .txt"
					className="p-1.5 text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover) rounded-lg transition-colors cursor-pointer"
				>
					<DownloadIcon size={16} />
				</button>
			</div>

			{/* Generated Results List with flash animation */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between text-[11px] text-(--p-text-subdued) px-0.5">
					<span className="font-semibold uppercase tracking-wider text-(--p-text-subdued)">
						Generated IDs (
						<span className="tabular-nums">{results.length}</span>)
					</span>
					<span className="text-[10px] text-(--p-text-subdued)">
						Click row to copy
					</span>
				</div>

				<div
					className={`space-y-1 max-h-[calc(100vh-360px)] overflow-y-auto pr-0.5 rounded-lg p-0.5 transition-all duration-200 ${
						isGeneratedAnim ? "animate-text-generated" : ""
					}`}
				>
					{results.map((id, index) => {
						const isCopied = copiedIndex === index
						return (
							<div
								key={index}
								onClick={() => handleCopySingle(id, index)}
								className={`group flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all bg-(--p-surface) border-(--p-border) hover:border-[#008060]/60 hover:bg-(--p-surface) text-(--p-text)`}
							>
								<div className="flex items-center gap-2 overflow-hidden">
									<span className="text-[10px] tabular-nums text-(--p-text-subdued) w-4 text-right shrink-0">
										{index + 1}
									</span>
									<span className="font-mono text-[11px] truncate select-all">
										{id}
									</span>
								</div>
								<div className="flex items-center shrink-0 pl-1">
									{isCopied ? (
										<span className="flex items-center gap-1 text-[10px] text-[#008060] dark:text-[#34d399] font-medium">
											<CheckIcon size={14} />
											<span>Copied</span>
										</span>
									) : (
										<CopyIcon
											size={14}
											className="text-(--p-text-subdued) group-hover:text-[#008060] dark:group-hover:text-[#34d399] transition-colors"
										/>
									)}
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}
