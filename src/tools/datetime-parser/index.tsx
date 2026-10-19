import {useState, useMemo} from "react"
import {
	CalendarIcon,
	CopyIcon,
	CheckIcon,
	RefreshIcon,
	SearchIcon,
	InfoIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {useToast} from "@/components/ui/toast"
import {
	parseAnyDate,
	formatAllDateVariants,
	extractDateMetadata,
	isValidDate,
	type FormattedDateItem,
} from "./utils"

type CategoryFilter =
	| "all"
	| "standard"
	| "database"
	| "programmatic"
	| "spreadsheet"

export function DateTimeParserView() {
	const [input, setInput] = useState<string>(() => new Date().toISOString())
	const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all")
	const [searchQuery, setSearchQuery] = useState("")
	const [copiedId, setCopiedId] = useState<string | null>(null)
	const {showToast} = useToast()

	// Parse date in real time
	const parsedDate = useMemo(() => {
		return parseAnyDate(input)
	}, [input])

	const formattedItems = useMemo(() => {
		if (!parsedDate) return []
		return formatAllDateVariants(parsedDate)
	}, [parsedDate])

	const metadata = useMemo(() => {
		if (!parsedDate) return null
		return extractDateMetadata(parsedDate)
	}, [parsedDate])

	// Filter items by category & search query
	const filteredItems = useMemo(() => {
		return formattedItems.filter((item) => {
			const matchesCategory =
				activeCategory === "all" || item.category === activeCategory
			const matchesSearch =
				!searchQuery ||
				item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(item.description &&
					item.description
						.toLowerCase()
						.includes(searchQuery.toLowerCase()))
			return matchesCategory && matchesSearch
		})
	}, [formattedItems, activeCategory, searchQuery])

	const handleCopy = async (item: FormattedDateItem) => {
		try {
			await navigator.clipboard.writeText(item.value)
			setCopiedId(item.id)
			showToast(`Copied ${item.label}`, "success")
			setTimeout(() => {
				setCopiedId(null)
			}, 1200)
		} catch {
			showToast("Failed to copy to clipboard", "error")
		}
	}

	const handlePresetNow = () => {
		setInput(new Date().toISOString())
		showToast("Reset to current timestamp", "info")
	}

	const handleOffset = (hours: number) => {
		try {
			const base =
				parsedDate && isValidDate(parsedDate) ? parsedDate : new Date()
			const next = new Date(base.getTime() + hours * 3600 * 1000)
			if (isValidDate(next)) setInput(next.toISOString())
		} catch {
			// ignore
		}
	}

	const handleOffsetDays = (days: number) => {
		try {
			const base =
				parsedDate && isValidDate(parsedDate) ? parsedDate : new Date()
			const next = new Date(base)
			next.setDate(next.getDate() + days)
			if (isValidDate(next)) setInput(next.toISOString())
		} catch {
			// ignore
		}
	}

	const handleStartOfDay = () => {
		try {
			const base =
				parsedDate && isValidDate(parsedDate) ? parsedDate : new Date()
			const next = new Date(base)
			next.setHours(0, 0, 0, 0)
			if (isValidDate(next)) setInput(next.toISOString())
		} catch {
			// ignore
		}
	}

	const handleEndOfDay = () => {
		try {
			const base =
				parsedDate && isValidDate(parsedDate) ? parsedDate : new Date()
			const next = new Date(base)
			next.setHours(23, 59, 59, 999)
			if (isValidDate(next)) setInput(next.toISOString())
		} catch {
			// ignore
		}
	}

	return (
		<div className="flex-1 flex flex-col gap-3 p-3 min-h-0">
			{/* Top Controls: Input Bar */}
			<div className="flex flex-col gap-1.5 p-3 rounded-lg border border-(--p-border) bg-(--p-surface) shadow-xs">
				<div className="flex items-center justify-between text-[11px]">
					<span className="font-semibold text-(--p-text) flex items-center gap-1.5">
						<CalendarIcon
							size={16}
							className="text-[#008060] dark:text-[#34d399]"
						/>
						<span>Any DateTime Input</span>
					</span>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="xs"
							onClick={handlePresetNow}
							className="h-6 px-2 text-[10px]"
							title="Reset to current local time"
						>
							<RefreshIcon size={12} className="mr-1" />
							Now
						</Button>
					</div>
				</div>

				<div className="relative">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Paste unix sec/ms, ISO string, Mongo ObjectId, RFC date, or 'now'..."
						className="font-mono text-xs pr-8"
						autoFocus
					/>
					{input && (
						<button
							onClick={() => setInput("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-(--p-text-subdued) hover:text-(--p-text) text-[10px] p-0.5 rounded cursor-pointer"
						>
							Clear
						</button>
					)}
				</div>

				{/* Quick Presets / Steppers */}
				<div className="flex flex-wrap items-center gap-1 pt-1 border-t border-(--p-border-subtle) text-[10px]">
					<span className="text-(--p-text-subdued) mr-0.5">
						Quick:
					</span>
					<button
						onClick={handleStartOfDay}
						className="px-1.5 py-0.5 rounded-md bg-(--p-surface-hover) border border-(--p-border) text-(--p-text) hover:border-[#008060] transition-colors cursor-pointer"
					>
						Start of Day
					</button>
					<button
						onClick={handleEndOfDay}
						className="px-1.5 py-0.5 rounded-md bg-(--p-surface-hover) border border-(--p-border) text-(--p-text) hover:border-[#008060] transition-colors cursor-pointer"
					>
						End of Day
					</button>
					<button
						onClick={() => handleOffset(-1)}
						className="px-1.5 py-0.5 rounded-md bg-(--p-surface-hover) border border-(--p-border) text-(--p-text) hover:border-[#008060] transition-colors tabular-nums cursor-pointer"
					>
						-1h
					</button>
					<button
						onClick={() => handleOffset(1)}
						className="px-1.5 py-0.5 rounded-md bg-(--p-surface-hover) border border-(--p-border) text-(--p-text) hover:border-[#008060] transition-colors tabular-nums cursor-pointer"
					>
						+1h
					</button>
					<button
						onClick={() => handleOffsetDays(-1)}
						className="px-1.5 py-0.5 rounded-md bg-(--p-surface-hover) border border-(--p-border) text-(--p-text) hover:border-[#008060] transition-colors tabular-nums cursor-pointer"
					>
						-1d
					</button>
					<button
						onClick={() => handleOffsetDays(1)}
						className="px-1.5 py-0.5 rounded-md bg-(--p-surface-hover) border border-(--p-border) text-(--p-text) hover:border-[#008060] transition-colors tabular-nums cursor-pointer"
					>
						+1d
					</button>
					<button
						onClick={() => handleOffsetDays(7)}
						className="px-1.5 py-0.5 rounded-md bg-(--p-surface-hover) border border-(--p-border) text-(--p-text) hover:border-[#008060] transition-colors tabular-nums cursor-pointer"
					>
						+7d
					</button>
				</div>
			</div>

			{/* Parsing Error State */}
			{!parsedDate && input.trim() && (
				<div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-card-entrance">
					<InfoIcon
						size={16}
						className="shrink-0 mt-0.5 text-rose-500"
					/>
					<div className="flex flex-col gap-0.5">
						<span className="font-semibold text-rose-800 dark:text-rose-300">
							Invalid or unrecognized date format
						</span>
						<span className="text-[11px] opacity-90 leading-relaxed text-rose-700 dark:text-rose-400">
							Could not parse &quot;{input.slice(0, 32)}
							{input.length > 32 ? "…" : ""}&quot;. Try ISO 8601
							(e.g. 2026-10-19T14:30:00Z), Unix timestamp
							(seconds/ms), Mongo ObjectId, standard dates
							(YYYY-MM-DD or DD/MM/YYYY), or relative keywords
							(&apos;now&apos;, &apos;+2h&apos;, &apos;-1d&apos;).
						</span>
					</div>
				</div>
			)}

			{/* Metadata Overview Banner */}
			{metadata && (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 rounded-lg border border-(--p-border) bg-(--p-surface) text-[10px] tabular-nums animate-card-entrance">
					<div className="flex flex-col gap-0.5 px-1.5 py-1 rounded bg-(--p-canvas)">
						<span className="text-(--p-text-subdued)">
							Day of Week
						</span>
						<span className="font-semibold text-(--p-text)">
							{metadata.dayOfWeek}
						</span>
					</div>
					<div className="flex flex-col gap-0.5 px-1.5 py-1 rounded bg-(--p-canvas)">
						<span className="text-(--p-text-subdued)">
							Day of Year
						</span>
						<span className="font-semibold text-(--p-text)">
							{metadata.dayOfYear} / {metadata.totalDaysInYear}
						</span>
					</div>
					<div className="flex flex-col gap-0.5 px-1.5 py-1 rounded bg-(--p-canvas)">
						<span className="text-(--p-text-subdued)">
							ISO Week / Quarter
						</span>
						<span className="font-semibold text-(--p-text)">
							W{metadata.weekNumber} • {metadata.quarter}
						</span>
					</div>
					<div className="flex flex-col gap-0.5 px-1.5 py-1 rounded bg-(--p-canvas)">
						<span className="text-(--p-text-subdued)">
							Relative
						</span>
						<span className="font-semibold text-[#008060] dark:text-[#34d399] truncate">
							{metadata.relativeTime}
						</span>
					</div>
				</div>
			)}

			{/* Filter Tabs & Search Header */}
			{parsedDate && (
				<div className="flex flex-col gap-2 shrink-0">
					<div className="flex items-center justify-between gap-2">
						{/* Polaris Categories */}
						<div className="flex items-center gap-1 p-0.5 rounded-lg bg-(--p-surface) border border-(--p-border) overflow-x-auto">
							{(
								[
									{id: "all", label: "All"},
									{id: "standard", label: "Standard"},
									{id: "database", label: "DB / Mongo"},
									{id: "spreadsheet", label: "Excel"},
									{id: "programmatic", label: "Code"},
								] as const
							).map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveCategory(tab.id)}
									className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
										activeCategory === tab.id
											? "bg-[#008060] text-white shadow-xs"
											: "text-(--p-text-subdued) hover:text-(--p-text)"
									}`}
								>
									{tab.label}
								</button>
							))}
						</div>

						{/* Quick Filter Search */}
						<div className="relative w-32 sm:w-40">
							<SearchIcon
								size={12}
								className="absolute left-2 top-1/2 -translate-y-1/2 text-(--p-text-subdued)"
							/>
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Filter formats..."
								className="w-full h-6 pl-6 pr-2 rounded-lg border border-(--p-border) bg-(--p-surface) text-[10px] text-(--p-text) placeholder:text-(--p-text-subdued) focus:outline-none focus:border-[#008060]"
							/>
						</div>
					</div>
				</div>
			)}

			{/* Formatted Date Cards List */}
			{parsedDate && (
				<div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-0.5">
					{filteredItems.map((item) => {
						const isCopied = copiedId === item.id
						return (
							<div
								key={item.id}
								onClick={() => handleCopy(item)}
								className="group p-2 rounded-lg border border-(--p-border) bg-(--p-surface) hover:border-[#008060]/50 hover:bg-(--p-surface-hover) transition-all cursor-pointer flex items-center justify-between gap-3 animate-card-entrance shadow-xs"
							>
								<div className="flex flex-col gap-0.5 overflow-hidden min-w-0">
									<div className="flex items-center gap-1.5">
										<span className="text-[10px] font-medium text-(--p-text-subdued) uppercase tracking-wider truncate">
											{item.label}
										</span>
									</div>
									<span className="font-mono text-xs font-semibold text-(--p-text) truncate tabular-nums select-all">
										{item.value}
									</span>
									{item.description && (
										<span className="text-[9px] text-(--p-text-subdued) truncate">
											{item.description}
										</span>
									)}
								</div>

								{/* Action Copy Icon */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation()
										handleCopy(item)
									}}
									className="p-1.5 rounded-md text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] transition-colors cursor-pointer shrink-0"
									title="Copy to clipboard"
								>
									{isCopied ? (
										<CheckIcon
											size={15}
											className="text-[#008060] dark:text-[#34d399]"
										/>
									) : (
										<CopyIcon size={15} />
									)}
								</button>
							</div>
						)
					})}

					{filteredItems.length === 0 && (
						<div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-(--p-text-subdued)">
							No formatters match &quot;{searchQuery}&quot; in
							this category.
						</div>
					)}
				</div>
			)}
		</div>
	)
}
