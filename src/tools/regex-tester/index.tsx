import {useMemo, useState, type ReactNode} from "react"
import {
	CopyIcon,
	RegexIcon,
	TrashIcon,
	CheckIcon,
	AlertIcon,
	SparklesIcon,
	HelpIcon,
	BookmarkIcon,
	SwapIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {Input, Textarea} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {useToast} from "@/components/ui/toast"
import {cn} from "@/lib/utils"
import {
	PATTERN_LIBRARY,
	buildSegments,
	explainRegex,
	runRegex,
} from "./utils"

const FLAGS = ["g", "i", "m", "s", "u", "y"] as const

const FLAG_HINTS: Record<string, string> = {
	g: "global — find every match",
	i: "ignore case",
	m: "multiline — ^ and $ match per line",
	s: "dotall — . also matches line breaks",
	u: "unicode mode",
	y: "sticky — match only at lastIndex",
}

/** Uppercase tracking-wider label shared by every section in the panel. */
function SectionLabel({
	icon,
	children,
}: {
	icon?: ReactNode
	children: ReactNode
}) {
	return (
		<span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-(--p-text-subdued) px-0.5">
			{icon}
			{children}
		</span>
	)
}

export function RegexTesterView() {
	const [pattern, setPattern] = useState("(?<key>[A-Z_]+)=(?<value>[^;]+)")
	const [flags, setFlags] = useState("g")
	const [input, setInput] = useState(
		"MODE=production;REGION=ap-southeast-1;DEBUG=false",
	)
	const [replacement, setReplacement] = useState("$1: $2")
	const [showExplain, setShowExplain] = useState(true)
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
	const {showToast} = useToast()

	const result = useMemo(
		() => runRegex(pattern, flags, input),
		[pattern, flags, input],
	)
	const segments = useMemo(
		() => buildSegments(input, result.matches),
		[input, result.matches],
	)
	const tokens = useMemo(() => explainRegex(pattern), [pattern])

	const replaced = useMemo(() => {
		if (!pattern || result.error) return ""
		try {
			const regex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g")
			return input.replace(regex, replacement)
		} catch {
			return ""
		}
	}, [pattern, flags, input, replacement, result.error])

	const hasMatches = result.matches.length > 0
	const totalGroups = result.matches.reduce(
		(sum, m) => sum + m.groups.length,
		0,
	)

	const toggleFlag = (flag: string) => {
		setFlags((prev) =>
			prev.includes(flag)
				? prev.replace(flag, "")
				: FLAGS.filter((f) => [...prev, f].includes(f)).join(""),
		)
	}

	const copy = (value: string, message = "Copied to clipboard") => {
		if (!value) return
		navigator.clipboard.writeText(value)
		showToast(message, "success")
	}

	const loadPreset = (index: number) => {
		const preset = PATTERN_LIBRARY[index]
		setPattern(preset.pattern)
		setFlags(preset.flags)
		setInput(preset.sample)
		setReplacement("$&")
		setCopiedIndex(null)
	}

	return (
		<div className="flex flex-col gap-3 p-3">
			{/* ------------------------------------------------ Pattern */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between px-0.5">
					<SectionLabel icon={<RegexIcon size={12} />}>
						Pattern
					</SectionLabel>
					<div className="flex items-center gap-1">
						{pattern && !result.error && (
							<Badge
								variant={hasMatches ? "success" : "secondary"}
								className="tabular-nums"
							>
								{result.matches.length}
								{result.truncated ? "+" : ""}{" "}
								{result.matches.length === 1 ? "match" : "matches"}
							</Badge>
						)}
						<Button
							variant="ghost"
							size="xs"
							className="text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399]"
							onClick={() => setShowExplain((v) => !v)}
							title="Toggle plain-English explanation"
						>
							<HelpIcon size={13} />
							<span>{showExplain ? "Hide explain" : "Explain"}</span>
						</Button>
					</div>
				</div>

				<div className="flex items-center gap-1">
					<span className="text-[11px] font-mono text-(--p-text-subdued) shrink-0">
						/
					</span>
					<Input
						value={pattern}
						onChange={(e) => setPattern(e.target.value)}
						placeholder="e.g. (?<year>\\d{4})-(\\d{2})-(\\d{2})"
						className="font-mono text-[11px]"
						spellCheck={false}
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						aria-label="Regular expression pattern"
					/>
					<span className="text-[11px] font-mono text-(--p-text-subdued) shrink-0">
						/{flags}
					</span>
				</div>

				{/* Flags + destructive action */}
				<div className="flex items-center gap-1 flex-wrap">
					{FLAGS.map((flag) => {
						const active = flags.includes(flag)
						return (
							<button
								key={flag}
								type="button"
								onClick={() => toggleFlag(flag)}
								title={FLAG_HINTS[flag]}
								aria-pressed={active}
								className={cn(
									"h-6 w-6 rounded-lg text-[11px] font-mono font-semibold border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008060]/70",
									active
										? "bg-[#008060]! text-white border-[#005e46] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
										: "bg-(--p-surface) text-(--p-text-subdued) border-(--p-border) hover:text-(--p-text) hover:border-(--p-text-subdued)",
								)}
							>
								{flag}
							</button>
						)
					})}
					{(pattern || input) && (
						<Button
							variant="ghost"
							size="xs"
							title="Clear pattern, test string and replacement"
							className="ml-auto text-(--p-text-subdued) hover:text-[#f87171]"
							onClick={() => {
								setPattern("")
								setInput("")
								setReplacement("")
							}}
						>
							<TrashIcon size={14} />
							<span>Clear</span>
						</Button>
					)}
				</div>
			</div>

			{/* --------------------------------------------- Error state */}
			{result.error && (
				<div className="flex items-start gap-1.5 p-2 rounded-lg bg-[#2d1518] border border-[#522327] text-[#f87171] text-[11px]">
					<AlertIcon size={15} className="shrink-0 mt-px" />
					<div className="flex flex-col gap-0.5 min-w-0">
						<span className="font-semibold">Invalid pattern</span>
						<span className="font-mono break-all">{result.error}</span>
					</div>
				</div>
			)}

			{/* ------------------------------------------- Test string */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between px-0.5">
					<SectionLabel>Test string</SectionLabel>
					<span className="text-[10px] tabular-nums text-(--p-text-subdued)">
						{input.length} chars
					</span>
				</div>
				<Textarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Paste the text you want to test against..."
					rows={5}
					className="text-[11px] font-mono"
					spellCheck={false}
					aria-label="Test string"
				/>

				{input && !result.error && (
					<div className="flex flex-col gap-1">
						<div className="flex items-center justify-between px-0.5">
							<SectionLabel>Live matches</SectionLabel>
							{hasMatches && (
								<button
									type="button"
									onClick={() =>
										copy(
											result.matches
												.map((m) => m.value)
												.join("\n"),
											"All matches copied",
										)
									}
									title="Copy all matched text"
									className="flex items-center gap-1 text-[10px] text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008060]/70 rounded"
								>
									<CopyIcon size={12} />
									<span>Copy all</span>
								</button>
							)}
						</div>
						<div className="p-2 rounded-lg bg-(--p-canvas) border border-(--p-border) text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
							{!hasMatches ? (
								<span className="text-(--p-text-subdued)">
									No matches yet — captured text is highlighted
									here the moment the pattern hits.
								</span>
							) : (
								segments.map((segment, i) =>
									segment.isMatch ? (
										<mark
											key={i}
											className="rounded-[3px] bg-[#008060]/20 text-(--p-text) px-0.5 ring-1 ring-inset ring-[#008060]/45 dark:bg-[#34d399]/25 dark:ring-[#34d399]/45"
											title={`Match ${(segment.matchIndex ?? 0) + 1}`}
										>
											{segment.text}
										</mark>
									) : (
										<span key={i} className="text-(--p-text-subdued)">
											{segment.text}
										</span>
									),
								)
							)}
						</div>
					</div>
				)}
			</div>

			{/* ------------------------------------------ Explanation */}
			{showExplain && pattern && !result.error && (
				<div className="flex flex-col gap-1 rounded-lg border border-(--p-border) bg-(--p-surface) p-2 animate-card-entrance">
					<div className="flex items-center justify-between px-0.5 pb-0.5">
						<SectionLabel icon={<HelpIcon size={12} />}>
							Explanation
						</SectionLabel>
						<span className="text-[9px] text-(--p-text-subdued) tabular-nums">
							{tokens.length} tokens
						</span>
					</div>
					<div className="flex flex-col gap-0.5 max-h-44 overflow-y-auto pr-1">
						{tokens.map((token, i) => (
							<div
								key={i}
								className="flex items-baseline gap-1.5"
								style={{paddingLeft: `${token.depth * 14}px`}}
							>
								<code
									className={cn(
										"text-[10px] font-mono px-1 rounded-md shrink-0 border border-(--p-border) bg-(--p-canvas)",
										token.depth % 2 === 0
											? "text-[#008060] dark:text-[#34d399]"
											: "text-[#1d5bbf] dark:text-[#60a5fa]",
									)}
								>
									{token.text}
								</code>
								<span className="text-[10px] text-(--p-text-subdued) leading-snug">
									{token.desc}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* ------------------------------------------- Captures */}
			{hasMatches && (
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between px-0.5">
						<SectionLabel>Captures</SectionLabel>
						{totalGroups > 0 && (
							<Badge variant="info" className="tabular-nums">
								{totalGroups}{" "}
								{totalGroups === 1 ? "group" : "groups"}
							</Badge>
						)}
					</div>
					<div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1">
						{result.matches.map((match, i) => (
							<div
								key={`${match.index}-${i}`}
								className="flex flex-col gap-1 p-2 rounded-lg bg-(--p-surface) border border-(--p-border)"
							>
								<div className="flex items-center gap-1.5">
									<Badge variant="info" className="tabular-nums shrink-0">
										#{i + 1}
									</Badge>
									<code className="flex-1 text-[10px] font-mono text-(--p-text) truncate">
										{match.value || "(empty match)"}
									</code>
									<span className="text-[9px] text-(--p-text-subdued) tabular-nums shrink-0">
										@{match.index}
									</span>
									<button
										type="button"
										onClick={() => {
											copy(match.value)
											setCopiedIndex(i)
											setTimeout(
												() => setCopiedIndex(null),
												1200,
											)
										}}
										className="p-0.5 text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] cursor-pointer shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008060]/70 rounded"
										title="Copy match"
									>
										{copiedIndex === i ? (
											<CheckIcon
												size={13}
												className="text-[#008060] dark:text-[#34d399]"
											/>
										) : (
											<CopyIcon size={13} />
										)}
									</button>
								</div>
								{match.groups.length > 0 && (
									<div className="flex flex-wrap gap-1 pl-1">
										{match.groups.map((group) => (
											<button
												type="button"
												key={group.index}
												onClick={() => copy(group.value ?? "")}
												title="Copy group value"
												className="flex items-baseline gap-1 px-1.5 py-0.5 rounded-md bg-(--p-canvas) border border-(--p-border) cursor-pointer hover:border-[#008060] transition-colors max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008060]/70"
											>
												<span className="text-[9px] text-(--p-text-subdued) shrink-0">
													{group.name
														? `${group.name}`
														: `$${group.index}`}
												</span>
												<code className="text-[10px] font-mono text-(--p-text) truncate">
													{group.value === undefined
														? "—"
														: group.value || '""'}
												</code>
											</button>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* ---------------------------------------------- Replace */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between px-0.5">
					<SectionLabel icon={<SwapIcon size={12} />}>
						Replace preview
					</SectionLabel>
					<span className="text-[9px] font-mono text-(--p-text-subdued)">
						$1 $2 $&amp; $&lt;name&gt;
					</span>
				</div>
				<Input
					value={replacement}
					onChange={(e) => setReplacement(e.target.value)}
					placeholder="$1 → $2"
					className="font-mono text-[11px]"
					spellCheck={false}
					autoComplete="off"
					aria-label="Replacement pattern"
				/>
				{replaced && (
					<div className="flex items-start gap-1.5">
						<pre className="flex-1 p-2 rounded-lg bg-(--p-canvas) border border-(--p-border) text-[10px] font-mono text-(--p-text) whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
							{replaced}
						</pre>
						<Button
							variant="ghost"
							size="icon-xs"
							title="Copy replaced text"
							onClick={() => copy(replaced, "Result copied")}
						>
							<CopyIcon size={14} />
						</Button>
					</div>
				)}
			</div>

			{/* ---------------------------------------------- Presets */}
			<div className="flex flex-col gap-1.5">
				<SectionLabel icon={<BookmarkIcon size={12} />}>
					Pattern library
				</SectionLabel>
				<div className="flex flex-wrap gap-1">
					{PATTERN_LIBRARY.map((preset, i) => (
						<button
							type="button"
							key={preset.name}
							onClick={() => loadPreset(i)}
							title={preset.note}
							className={cn(
								"flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-(--p-surface) text-(--p-text-subdued) border border-(--p-border) transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008060]/70",
								preset.pattern === pattern
									? "border-[#008060] text-[#008060] dark:text-[#34d399]"
									: "hover:text-[#008060] dark:hover:text-[#34d399] hover:border-[#008060]",
							)}
						>
							<SparklesIcon size={11} />
							<span>{preset.name}</span>
						</button>
					))}
				</div>
			</div>

			<div className="flex items-center gap-1.5 text-[9px] text-(--p-text-subdued) pt-1">
				<RegexIcon size={12} />
				<span>
					Native RegExp only — nothing is compiled remotely and input stays
					in this panel.
				</span>
			</div>
		</div>
	)
}
