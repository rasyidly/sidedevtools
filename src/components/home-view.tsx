import {useState, useMemo, useRef, useEffect} from "react"
import {
	SearchIcon,
	CloseIcon,
	StarIcon,
	HistoryIcon,
	ChevronRightIcon,
	ChevronDownIcon,
	FilterIcon,
	HeartIcon,
	SortAlphabetIcon,
} from "@/components/ui/solar-icon"
import {TOOLS} from "@/data/tools"
import type {DevTool, ToolCategory} from "@/types/tool"
import {ToolIcon} from "@/components/ui/tool-icon"
import {cn} from "@/lib/utils"

interface HomeViewProps {
	onSelectTool: (toolId: string) => void
	recentToolIds: string[]
	favorites: string[]
	onToggleFavorite: (toolId: string) => void
	onOpenSupport?: (tab: "about" | "crypto") => void
}

export type SortOption = "asc" | "desc" | "latest" | "oldest"

export function HomeView({
	onSelectTool,
	recentToolIds,
	favorites,
	onToggleFavorite,
	onOpenSupport,
}: HomeViewProps) {
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedCategory, setSelectedCategory] =
		useState<ToolCategory>("all")
	const [sortBy, setSortBy] = useState<SortOption>(() => {
		try {
			const saved = localStorage.getItem("SideDevTools_sortBy")
			if (
				saved === "asc" ||
				saved === "desc" ||
				saved === "latest" ||
				saved === "oldest"
			) {
				return saved
			}
		} catch {}
		return "asc"
	})
	const searchInputRef = useRef<HTMLInputElement>(null)

	// Save sort preference
	useEffect(() => {
		try {
			localStorage.setItem("SideDevTools_sortBy", sortBy)
		} catch {}
	}, [sortBy])

	// Focus search input on "/" key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.key === "/" &&
				document.activeElement !== searchInputRef.current
			) {
				e.preventDefault()
				searchInputRef.current?.focus()
			}
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [])

	// Filter & sort tools based on query, category, and sortBy
	const filteredTools = useMemo(() => {
		const q = searchQuery.toLowerCase().trim()
		const filtered = TOOLS.filter((tool) => {
			// Category filter
			if (
				selectedCategory !== "all" &&
				tool.category !== selectedCategory
			) {
				return false
			}

			// Query filter: match name, description, or tags
			if (!q) return true

			const matchName = tool.name.toLowerCase().includes(q)
			const matchDesc = tool.description.toLowerCase().includes(q)
			const matchTags = tool.tags.some((tag) =>
				tag.toLowerCase().includes(q),
			)

			return matchName || matchDesc || matchTags
		})

		// Sort
		return [...filtered].sort((a, b) => {
			if (sortBy === "asc") {
				return a.name.localeCompare(b.name)
			}
			if (sortBy === "desc") {
				return b.name.localeCompare(a.name)
			}
			if (sortBy === "latest") {
				return (b.addedAt ?? 0) - (a.addedAt ?? 0)
			}
			if (sortBy === "oldest") {
				return (a.addedAt ?? 0) - (b.addedAt ?? 0)
			}
			return 0
		})
	}, [searchQuery, selectedCategory, sortBy])

	// Get recent tools objects
	const recentTools = useMemo(() => {
		return recentToolIds
			.map((id) => TOOLS.find((t) => t.id === id))
			.filter((t): t is DevTool => Boolean(t))
			.slice(0, 3)
	}, [recentToolIds])

	// Get favorite tools objects
	const favoriteTools = useMemo(() => {
		return favorites
			.map((id) => TOOLS.find((t) => t.id === id))
			.filter((t): t is DevTool => Boolean(t))
	}, [favorites])

	const categories: {id: ToolCategory; label: string}[] = [
		{id: "all", label: "All"},
		{id: "generators", label: "Generators"},
		{id: "converters", label: "Converters"},
		{id: "formatters", label: "Formatters"},
		{id: "web", label: "Web"},
	]

	return (
		<div className="flex-1 flex flex-col gap-3 p-3">
			{/* Polaris Search Header */}
			<div className="relative">
				<div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
					<SearchIcon size={16} className="text-(--p-text-subdued)" />
				</div>
				<input
					ref={searchInputRef}
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Search tools, formats, or tags... (Press /)"
					className="w-full pl-8 pr-7 py-1.5 bg-(--p-surface) border border-(--p-border) rounded-lg text-xs text-(--p-text) placeholder:text-(--p-text-subdued) shadow-[inset_0_1px_1px_rgba(0,0,0,0.06)] focus:outline-none focus:border-[#008060]! focus:ring-1 focus:ring-[#008060]! transition-colors"
				/>
				{searchQuery && (
					<button
						onClick={() => setSearchQuery("")}
						className="absolute inset-y-0 right-0 pr-2 flex items-center text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer"
					>
						<CloseIcon size={15} />
					</button>
				)}
			</div>

			{/* Polaris Category Filter Pills */}
			<div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
				{categories.map((cat) => (
					<button
						key={cat.id}
						onClick={() => setSelectedCategory(cat.id)}
						className={cn(
							"px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer transition-all border",
							selectedCategory === cat.id
								? "bg-[#008060]! text-white border-[#005e46] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
								: "bg-(--p-surface) text-(--p-text-subdued) border-(--p-border) hover:bg-(--p-surface-hover) hover:text-(--p-text)",
						)}
					>
						{cat.label}
					</button>
				))}
			</div>

			{/* Favorites / Quick Launch */}
			{!searchQuery && favoriteTools.length > 0 && (
				<div className="flex flex-col gap-1.5 animate-card-entrance">
					<div className="flex items-center gap-1.5 text-[11px] text-(--p-text) font-semibold">
						<StarIcon size={14} className="text-[#f59e0b]!" />
						<span>Favorites</span>
						<span className="text-[10px] text-(--p-text-subdued) tabular-nums">
							({favoriteTools.length})
						</span>
					</div>
					<div className="grid grid-cols-2 gap-1.5">
						{favoriteTools.map((tool) => (
							<button
								key={tool.id}
								onClick={() => onSelectTool(tool.id)}
								className="flex items-center gap-2 p-2 rounded-xl bg-(--p-surface) border border-(--p-border) hover:bg-(--p-surface-hover) transition-all text-left cursor-pointer group shadow-[0_1px_1px_rgba(0,0,0,0.06)]"
							>
								<ToolIcon
									name={tool.icon}
									size={18}
									className="text-[#008060]! dark:text-[#34d399]! shrink-0"
								/>
								<div className="overflow-hidden">
									<div className="text-[11px] font-semibold text-(--p-text) truncate group-hover:text-[#008060]! dark:group-hover:text-[#34d399]! transition-colors">
										{tool.shortName}
									</div>
									<div className="text-[10px] text-(--p-text-subdued) capitalize truncate">
										{tool.category}
									</div>
								</div>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Recently Opened */}
			{!searchQuery && recentTools.length > 0 && (
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-1 text-[11px] text-(--p-text-subdued) font-medium">
						<HistoryIcon size={14} />
						<span>Recently Opened</span>
					</div>
					<div className="flex overflow-x-auto gap-1.5">
						{recentTools.map((tool) => (
							<button
								key={tool.id}
								onClick={() => onSelectTool(tool.id)}
								className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-(--p-surface) border border-(--p-border) hover:border-(--p-border-subtle) text-(--p-text) text-[11px] cursor-pointer transition-colors"
							>
								<ToolIcon
									name={tool.icon}
									size={14}
									className="text-[#008060]! dark:text-[#34d399]!"
								/>
								<span className="text-nowrap">
									{tool.shortName}
								</span>
							</button>
						))}
					</div>
				</div>
			)}

			{/* All Tools List with Staggered Entrance Animation */}
			<div className="flex-1 flex flex-col gap-2">
				<div className="flex items-center justify-between text-[11px] text-(--p-text-subdued) px-0.5">
					<div className="flex items-center gap-2">
						<span className="font-semibold uppercase tracking-wider text-(--p-text-subdued)">
							{searchQuery ? `Search Results` : "All DevTools"}
						</span>
						{/* Sort by dropdown */}
						<div className="relative inline-flex items-center">
							<select
								value={sortBy}
								onChange={(e) =>
									setSortBy(e.target.value as SortOption)
								}
								aria-label="Sort devtools"
								className="appearance-none bg-(--p-surface) hover:bg-(--p-surface-hover) text-[10px] font-medium text-(--p-text) border border-(--p-border) rounded-md pl-2 pr-5 py-0.5 cursor-pointer focus:outline-none focus:border-[#008060]! transition-colors shadow-xs"
							>
								<option value="asc">Sort: A-Z (Asc)</option>
								<option value="desc">Sort: Z-A (Desc)</option>
								<option value="latest">Sort: Latest</option>
								<option value="oldest">Sort: Oldest</option>
							</select>
							<ChevronDownIcon
								size={12}
								className="absolute right-1.5 pointer-events-none text-(--p-text-subdued)"
							/>
						</div>
					</div>
					<span className="tabular-nums font-medium text-[10px]">
						{filteredTools.length}{" "}
						{filteredTools.length === 1 ? "tool" : "tools"}
					</span>
				</div>

				{filteredTools.length === 0 ? (
					<div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-(--p-border) bg-(--p-surface)/50 animate-card-entrance my-auto">
						<FilterIcon
							size={26}
							className="text-(--p-text-subdued) mb-2"
						/>
						<p className="text-xs font-semibold text-(--p-text)">
							No tools match your query
						</p>
						<p className="text-[11px] text-(--p-text-subdued) mt-0.5 max-w-xs">
							Try a different keyword or select category
							&quot;All&quot;
						</p>
					</div>
				) : (
					<div className="flex flex-col rounded-lg border border-(--p-border) bg-(--p-surface) divide-y divide-(--p-border-subtle) overflow-hidden shadow-xs">
						{filteredTools.map((tool, index) => {
							const isFav = favorites.includes(tool.id)
							return (
								<div
									key={tool.id}
									onClick={() => onSelectTool(tool.id)}
									style={{
										animationDelay: `${Math.min(index * 25, 180)}ms`,
									}}
									className="group flex items-center justify-between p-2.5 hover:bg-(--p-surface-hover) transition-colors cursor-pointer animate-card-entrance"
								>
									<div className="flex items-center gap-2.5 overflow-hidden">
										<ToolIcon
											name={tool.icon}
											size={18}
											className="text-[#008060]! dark:text-[#34d399]! shrink-0"
										/>
										<div className="overflow-hidden">
											<h3 className="text-xs font-semibold text-(--p-text) group-hover:text-[#008060]! dark:group-hover:text-[#34d399]! transition-colors truncate">
												{tool.name}
											</h3>
											<p className="text-[10px] text-(--p-text-subdued) truncate">
												{tool.description}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-1 shrink-0 ml-2">
										<button
											onClick={(e) => {
												e.stopPropagation()
												onToggleFavorite(tool.id)
											}}
											className={cn(
												"p-1 text-(--p-text-subdued) hover:text-[#f59e0b] transition-colors cursor-pointer",
												isFav && "text-[#f59e0b]",
											)}
											title={
												isFav
													? "Remove from favorites"
													: "Add to favorites"
											}
										>
											<StarIcon
												size={15}
												className={cn(
													isFav
														? "text-[#f59e0b]"
														: "opacity-60",
												)}
											/>
										</button>
										<ChevronRightIcon
											size={15}
											className="text-(--p-text-subdued) group-hover:text-[#008060]! dark:group-hover:text-[#34d399]! transition-colors"
										/>
									</div>
								</div>
							)
						})}
					</div>
				)}
			</div>

			{/* Production Grade Footer */}
			<div className="flex items-center justify-between text-[10px] pt-2.5 text-(--p-text-subdued) mt-auto">
				<div className="flex items-center gap-1.5">
					<span className="font-semibold text-(--p-text)">
						SideDevTools
					</span>
					<span className="opacity-40">•</span>
					<span>
						by{" "}
						<a
							href="https://github.com/rasyidly"
							target="_blank"
							rel="noreferrer"
							className="font-medium text-(--p-text) hover:text-[#008060] dark:hover:text-[#34d399] transition-colors underline underline-offset-2"
						>
							rasyidly
						</a>
					</span>
				</div>
				<div className="flex items-center gap-1">
					{onOpenSupport && (
						<button
							onClick={() => onOpenSupport("crypto")}
							className="flex items-center gap-1  hover:text-rose-600 transition-colors cursor-pointer font-medium"
							title="Tip Developer via Crypto"
						>
							<HeartIcon size={12} />
							<span>Tip</span>
						</button>
					)}
					<span className="opacity-40">•</span>
					<a
						href="https://github.com/rasyidly/sidedevtools/issues"
						className="hover:text-(--p-text) transition-colors"
						title="Send Feedback"
						target="_blank"
					>
						Feedback
					</a>
				</div>
			</div>
		</div>
	)
}
