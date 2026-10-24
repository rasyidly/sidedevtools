import {useCallback, useEffect, useMemo, useState} from "react"
import {
	SparklesIcon,
	CheckIcon,
	RefreshIcon,
	GlobeIcon,
	HistoryIcon,
	TrashIcon,
	HelpIcon,
	EyeIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {Switch} from "@/components/ui/switch"
import {useToast} from "@/components/ui/toast"
import {cn} from "@/lib/utils"
import {ALL_CATALOG_ITEMS, FAKER_LOCALES, createFaker, localeLabel, renderPattern} from "@/lib/faker"
import {
	injectIntoActiveTab,
	pingFormFiller,
	requestFill,
	syncFormFiller,
} from "@/lib/form-filler-registration"
import {
	CONFIG_KEY,
	DEFAULT_CONFIG,
	FIELD_KINDS,
	KIND_LABELS,
	patternForKind,
} from "./utils"
import type {FieldKind, FormFillerConfig, Modifier} from "./utils"

interface ActivityEntry {
	id: number
	host: string
	scope: "field" | "form"
	filled: number
	kinds: string[]
	at: number
}

const MODIFIER_LABEL: Record<Modifier, string> = {
	meta: "⌘ Command",
	ctrl: "Ctrl",
	alt: "Alt / Option",
}

const MODIFIER_SYMBOL: Record<Modifier, string> = {
	meta: "⌘",
	ctrl: "Ctrl",
	alt: "Alt",
}

/** Patterns that make sense for form fields, surfaced as one-click picks. */
const PATTERN_QUICK_PICKS: {label: string; pattern: string}[] = [
	{label: "Full name", pattern: "{{person.fullName}}"},
	{label: "First name", pattern: "{{person.firstName}}"},
	{label: "Last name", pattern: "{{person.lastName}}"},
	{label: "Email", pattern: "{{internet.email}}"},
	{label: "Username", pattern: "{{internet.username}}"},
	{label: "Password", pattern: '{{internet.password:{"length":16,"memorable":false}}}'},
	{label: "Phone", pattern: "{{phone.number}}"},
	{label: "Company", pattern: "{{company.name}}"},
	{label: "Job title", pattern: "{{person.jobTitle}}"},
	{label: "Street", pattern: "{{location.streetAddress}}"},
	{label: "City", pattern: "{{location.city}}"},
	{label: "State", pattern: "{{location.state}}"},
	{label: "Zip code", pattern: "{{location.zipCode}}"},
	{label: "Country", pattern: "{{location.country}}"},
	{label: "URL", pattern: "{{internet.url}}"},
	{label: "Number", pattern: '{{number.int:{"min":1,"max":999}}}'},
	{label: "Price", pattern: "{{number.float:{\"min\":5,\"max\":900,\"fractionDigits\":2}}}"},
	{label: "Sentence", pattern: "{{lorem.sentence}}"},
	{label: "Paragraph", pattern: "{{lorem.sentences:2}}"},
	{label: "Credit card", pattern: "{{finance.creditCardNumber}}"},
	{label: "CVV", pattern: "{{finance.creditCardCVV}}"},
	{label: "IBAN", pattern: "{{finance.iban}}"},
	{label: "Boolean", pattern: "{{boolean}}"},
	{label: "Hex color", pattern: "{{color.hex}}"},
]

function saveConfig(config: FormFillerConfig) {
	if (typeof chrome === "undefined" || !chrome.storage?.local) return
	chrome.storage.local.set({[CONFIG_KEY]: config})
}

function OptionRow({
	label,
	hint,
	checked,
	onChange,
	disabled,
}: {
	label: string
	hint: string
	checked: boolean
	onChange: (value: boolean) => void
	disabled?: boolean
}) {
	return (
		<label
			className={cn(
				"flex items-start justify-between gap-2 px-2 py-1.5 rounded-lg border border-(--p-border) bg-(--p-surface) transition-opacity cursor-pointer",
				disabled && "opacity-50",
			)}
		>
			<span className="flex flex-col gap-0.5 min-w-0">
				<span className="text-[11px] font-medium text-(--p-text)">{label}</span>
				<span className="text-[9px] text-(--p-text-subdued) leading-snug">
					{hint}
				</span>
			</span>
			<Switch
				size="sm"
				checked={checked}
				onCheckedChange={onChange}
				disabled={disabled}
			/>
		</label>
	)
}

function MappingRow({
	kind,
	config,
	sample,
	active,
	onChange,
	onFocus,
	onReset,
}: {
	kind: FieldKind
	config: FormFillerConfig
	sample: string
	active: boolean
	onChange: (pattern: string) => void
	onFocus: () => void
	onReset: () => void
}) {
	const overridden = config.overrides[kind] !== undefined
	return (
		<div
			className={cn(
				"flex flex-col gap-0.5 p-1.5 rounded-lg border transition-colors",
				active ? "border-[#008060] bg-(--p-surface)" : "border-(--p-border-subtle)",
			)}
		>
			<div className="flex items-center gap-1.5">
				<span className="text-[10px] font-semibold text-(--p-text) w-20 shrink-0 truncate">
					{KIND_LABELS[kind]}
				</span>
				<Input
					value={patternForKind(kind, config)}
					onChange={(event) => onChange(event.target.value)}
					onFocus={onFocus}
					className="font-mono text-[10px] flex-1 h-6"
					spellCheck={false}
				/>
				{overridden && (
					<button
						onClick={onReset}
						title="Reset to default pattern"
						className="p-1 text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] transition-colors cursor-pointer shrink-0"
					>
						<RefreshIcon size={12} />
					</button>
				)}
			</div>
			<span className="text-[9px] font-mono text-(--p-text-subdued) truncate pl-21.5">
				→ {sample || "no sample"}
			</span>
		</div>
	)
}

export function FormFillerView() {
	const [config, setConfig] = useState<FormFillerConfig | null>(null)
	const [tabHost, setTabHost] = useState<string | null>(null)
	const [injected, setInjected] = useState<boolean | null>(null)
	const [activity, setActivity] = useState<ActivityEntry[]>([])
	const [showMappings, setShowMappings] = useState(false)
	const [activeKind, setActiveKind] = useState<FieldKind | null>(null)
	const [mappingSearch, setMappingSearch] = useState("")
	const [busy, setBusy] = useState(false)
	const {showToast} = useToast()

	// Load persisted configuration.
	useEffect(() => {
		let cancelled = false
		const load = async () => {
			let stored: FormFillerConfig | undefined
			try {
				const result = await chrome.storage.local.get(CONFIG_KEY)
				stored = result?.[CONFIG_KEY] as FormFillerConfig | undefined
			} catch {}
			if (cancelled) return
			setConfig({...DEFAULT_CONFIG, ...(stored ?? {})})
		}
		void load()
		return () => {
			cancelled = true
		}
	}, [])

	const update = useCallback((patch: Partial<FormFillerConfig>) => {
		setConfig((prev) => {
			if (!prev) return prev
			const next = {...prev, ...patch}
			saveConfig(next)
			return next
		})
	}, [])

	// Track the active tab so the panel can report and act on it.
	useEffect(() => {
		if (typeof chrome === "undefined" || !chrome.tabs) return
		const refresh = async () => {
			try {
				const [tab] = await chrome.tabs.query({
					active: true,
					lastFocusedWindow: true,
				})
				if (!tab) return
				setTabHost(tab.url ? new URL(tab.url).hostname : null)
				if (config?.enabled && tab.id !== undefined) {
					setInjected(await pingFormFiller(tab.id))
				} else {
					setInjected(null)
				}
			} catch {
				setTabHost(null)
			}
		}
		void refresh()
		const listener = () => void refresh()
		chrome.tabs.onActivated?.addListener(listener)
		chrome.tabs.onUpdated?.addListener(listener)
		return () => {
			chrome.tabs.onActivated?.removeListener(listener)
			chrome.tabs.onUpdated?.removeListener(listener)
		}
	}, [config?.enabled])

	// Live feedback from the content script.
	useEffect(() => {
		if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) return
		const listener = (message: {
			type?: string
			payload?: Omit<ActivityEntry, "id" | "at">
		}) => {
			if (message?.type !== "form-filler:filled" || !message.payload) return
			setActivity((prev) =>
				[
					{
						...message.payload!,
						id: Date.now() + Math.random(),
						at: Date.now(),
					},
					...prev,
				].slice(0, 6),
			)
		}
		chrome.runtime.onMessage.addListener(listener)
		return () => chrome.runtime.onMessage.removeListener(listener)
	}, [])

	const fakerSample = useMemo(() => {
		const samples: Record<string, string> = {}
		if (!config) return samples
		let faker
		try {
			faker = createFaker(config.locale, 7)
		} catch {
			return samples
		}
		for (const kind of FIELD_KINDS) {
			try {
				samples[kind] = renderPattern(faker, patternForKind(kind, config))
			} catch (error) {
				samples[kind] =
					error instanceof Error ? `⚠ ${error.message}` : "invalid pattern"
			}
		}
		return samples
	}, [config])

	const toggleEnabled = async (enabled: boolean) => {
		update({enabled})
		setBusy(true)
		const result = await syncFormFiller(enabled)
		if (!result.ok) {
			setBusy(false)
			showToast(
				`Chrome refused the change: ${result.error ?? "unknown error"}`,
				"error",
			)
			return
		}

		// Make it usable in the tab that is already open, no reload required.
		if (enabled && typeof chrome !== "undefined" && chrome.tabs) {
			const [tab] = await chrome.tabs.query({
				active: true,
				lastFocusedWindow: true,
			})
			if (tab?.id !== undefined) {
				const injectedNow = await injectIntoActiveTab(tab.id)
				setInjected(injectedNow ? await pingFormFiller(tab.id) : false)
			}
		} else {
			setInjected(null)
		}

		setBusy(false)
		showToast(
			enabled
				? "Form Filler enabled — ⌘ + double-click any input"
				: "Form Filler disabled — nothing is injected",
			"success",
		)
	}

	const triggerFill = async (scope: "field" | "form") => {
		if (typeof chrome === "undefined" || !chrome.tabs) {
			showToast("Needs the Chrome extension context", "error")
			return
		}
		const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true})
		if (!tab?.id) {
			showToast("No active tab", "error")
			return
		}
		const result = await requestFill(tab.id, scope)
		if (!result) {
			showToast("Content script not reachable — reload the tab", "error")
			return
		}
		showToast(
			result.filled > 0
				? `Filled ${result.filled} field${result.filled === 1 ? "" : "s"}`
				: "Nothing matched on that tab",
			result.filled > 0 ? "success" : "error",
		)
	}

	const filteredKinds = useMemo(() => {
		const query = mappingSearch.trim().toLowerCase()
		if (!query) return FIELD_KINDS
		return FIELD_KINDS.filter(
			(kind) =>
				kind.includes(query) || KIND_LABELS[kind].toLowerCase().includes(query),
		)
	}, [mappingSearch])

	const overrideCount = config ? Object.keys(config.overrides).length : 0

	return (
		<div className="flex flex-col gap-3 p-3">
			{!config ? (
				<div className="flex-1 min-h-[40vh] flex flex-col items-center justify-center gap-2 text-center">
					<div className="w-6 h-6 rounded-full border-2 border-(--p-border) border-t-[#008060] animate-spin" />
					<span className="text-[11px] text-(--p-text-subdued)">
						Loading Form Filler…
					</span>
				</div>
			) : (
				<>
					{/* Master switch */}
					<div
						className={cn(
							"flex items-center gap-2 p-2.5 rounded-lg border transition-colors",
							config.enabled
								? "border-[#008060] bg-(--p-surface)"
								: "border-(--p-border) bg-(--p-surface)",
						)}
					>
						<span
							className={cn(
								"h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border",
								config.enabled
									? "bg-[#0d221a] border-[#144733] text-[#34d399]"
									: "bg-(--p-surface-subdued) border-(--p-border) text-(--p-text-subdued)",
							)}
						>
							<SparklesIcon size={16} />
						</span>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1.5">
								<span className="text-[11px] font-semibold text-(--p-text)">
									{config.enabled ? "Enabled" : "Disabled"}
								</span>
								<Badge variant={config.enabled ? "success" : "secondary"}>
									{config.enabled ? "injected" : "idle"}
								</Badge>
							</div>
							<span className="text-[9px] text-(--p-text-subdued) leading-snug block">
								{config.enabled
									? "Content script registered on all sites"
									: "No content script runs on any page"}
							</span>
						</div>
						<Switch
							size="sm"
							checked={config.enabled}
							disabled={busy}
							onCheckedChange={(checked) => void toggleEnabled(checked)}
						/>
					</div>

					{/* Gesture */}
					<div className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-(--p-border) bg-(--p-surface)">
						<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
							Activation gesture
						</span>
						<div className="flex flex-col gap-1.5 text-[11px]">
							<div className="flex items-center gap-1.5">
								<kbd className="px-1.5 py-0.5 rounded-md bg-(--p-canvas) border border-(--p-border) font-mono text-[10px] text-(--p-text)">
									{MODIFIER_SYMBOL[config.modifier]}
								</kbd>
								<span className="text-(--p-text-subdued)">+</span>
								<kbd className="px-1.5 py-0.5 rounded-md bg-(--p-canvas) border border-(--p-border) font-mono text-[10px] text-(--p-text)">
									double-click
								</kbd>
								<span className="text-(--p-text) font-medium ml-1">
									fill the focused field
								</span>
							</div>
							{config.shiftFillsForm && (
								<div className="flex items-center gap-1.5">
									<kbd className="px-1.5 py-0.5 rounded-md bg-(--p-canvas) border border-(--p-border) font-mono text-[10px] text-(--p-text)">
										{MODIFIER_SYMBOL[config.modifier]} + Shift
									</kbd>
									<span className="text-(--p-text-subdued)">+</span>
									<kbd className="px-1.5 py-0.5 rounded-md bg-(--p-canvas) border border-(--p-border) font-mono text-[10px] text-(--p-text)">
										double-click
									</kbd>
									<span className="text-(--p-text) font-medium ml-1">
										fill the whole form
									</span>
								</div>
							)}
						</div>

						<div className="flex flex-col gap-1 pt-1">
							<span className="text-[9px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								Modifier key
							</span>
							<div className="flex items-center bg-(--p-surface-subdued) border border-(--p-border) rounded-lg p-0.5">
								{(Object.keys(MODIFIER_LABEL) as Modifier[]).map((key) => (
									<button
										key={key}
										onClick={() => update({modifier: key})}
										className={cn(
											"flex-1 py-0.5 rounded-lg text-[10px] font-medium cursor-pointer transition-colors",
											config.modifier === key
												? "bg-(--p-surface) text-[#008060] dark:text-[#34d399] font-semibold shadow-xs"
												: "text-(--p-text-subdued) hover:text-(--p-text)",
										)}
									>
										{MODIFIER_LABEL[key]}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Live tab status */}
					<div className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-(--p-border) bg-(--p-surface)">
						<div className="flex items-center gap-1.5">
							<GlobeIcon size={13} className="text-(--p-text-subdued)" />
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								Active tab
							</span>
							{tabHost && (
								<Badge
									variant={
										!config.enabled
											? "secondary"
											: injected
												? "success"
												: "attention"
									}
									className="ml-auto"
								>
									{!config.enabled
										? "disabled"
										: injected
											? "ready"
											: "reload needed"}
								</Badge>
							)}
						</div>
						<span className="text-[10px] font-mono text-(--p-text) truncate">
							{tabHost ?? "No page in focus"}
						</span>
						{config.enabled && tabHost && tabHost !== "" && injected === false && (
							<span className="text-[9px] text-(--p-text-subdued) leading-snug">
								Reload this tab (or navigate in it) so Chrome injects the
								content script into the new page.
							</span>
						)}

						<div className="flex items-center gap-1.5 pt-0.5">
							<Button
								size="sm"
								disabled={!config.enabled || !tabHost}
								onClick={() => void triggerFill("field")}
							>
								<SparklesIcon size={13} />
								<span>Fill focused field</span>
							</Button>
							<Button
								variant="secondary"
								size="sm"
								disabled={!config.enabled || !tabHost}
								onClick={() => void triggerFill("form")}
							>
								<span>Fill form</span>
							</Button>
						</div>
					</div>

					{/* Language & data */}
					<div className="grid grid-cols-2 gap-1.5">
						<label className="flex flex-col gap-1">
							<span className="text-[9px] font-semibold uppercase tracking-wider text-(--p-text-subdued) px-0.5">
								Language
							</span>
							<select
								value={config.locale}
								onChange={(event) => update({locale: event.target.value})}
								className="h-7 rounded-lg border border-(--p-border) bg-(--p-surface) px-2 text-[11px] text-(--p-text) cursor-pointer focus:outline-none focus:border-[#008060]"
							>
								{FAKER_LOCALES.map((option) => (
									<option key={option.id} value={option.id}>
										{option.flag} {option.label}
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1">
							<span className="text-[9px] font-semibold uppercase tracking-wider text-(--p-text-subdued) px-0.5">
								Seed (0 = new each fill)
							</span>
							<Input
								type="number"
								value={config.seed}
								onChange={(event) =>
									update({seed: Number(event.target.value) || 0})
								}
								className="tabular-nums text-[11px]"
							/>
						</label>
					</div>

					<span className="flex items-center gap-1.5 text-[9px] text-(--p-text-subdued) px-0.5 -mt-1.5">
						<HistoryIcon size={11} />
						<span>
							Detected values will be {localeLabel(config.locale)} — e.g.{" "}
							<span className="font-mono">{fakerSample.email}</span>
						</span>
					</span>

					{/* Behaviour */}
					<div className="flex flex-col gap-1.5">
						<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued) px-0.5">
							Behaviour
						</span>
						<OptionRow
							label="Only fill empty fields"
							hint="Never overwrite what you already typed"
							checked={config.onlyEmpty}
							onChange={(checked) => update({onlyEmpty: checked})}
						/>
						<OptionRow
							label="Shift fills the whole form"
							hint="Otherwise the gesture always touches one field"
							checked={config.shiftFillsForm}
							onChange={(checked) => update({shiftFillsForm: checked})}
						/>
						<OptionRow
							label="Highlight filled fields"
							hint="Brief emerald outline so you can see what changed"
							checked={config.showHighlight}
							onChange={(checked) => update({showHighlight: checked})}
						/>
						<OptionRow
							label="Fill select menus"
							hint="Pick a random non-empty option"
							checked={config.fillSelects}
							onChange={(checked) => update({fillSelects: checked})}
						/>
						<OptionRow
							label="Show in-page confirmation"
							hint="Small floating pill with the fill summary"
							checked={config.showToast}
							onChange={(checked) => update({showToast: checked})}
						/>
					</div>

					{/* Field recognition */}
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between px-0.5">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								Field recognition
							</span>
							<div className="flex items-center gap-1">
								{overrideCount > 0 && (
									<Badge variant="info" className="tabular-nums">
										{overrideCount} custom
									</Badge>
								)}
								<Button
									variant="ghost"
									size="xs"
									className="text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399]"
									onClick={() => setShowMappings((value) => !value)}
								>
									<span>{showMappings ? "Hide" : "Configure"}</span>
								</Button>
							</div>
						</div>

						<p className="flex items-start gap-1.5 text-[9px] text-(--p-text-subdued) px-0.5 leading-snug">
							<EyeIcon size={11} className="mt-0.5 shrink-0" />
							<span>
								The filler reads autocomplete, input type, name, id,
								placeholder and label to decide what a field wants. Override
								any pattern — changes apply instantly.
							</span>
						</p>

						{showMappings && (
							<div className="flex flex-col gap-1.5 p-2 rounded-lg border border-(--p-border) bg-(--p-surface) animate-card-entrance">
								<Input
									value={mappingSearch}
									onChange={(event) => setMappingSearch(event.target.value)}
									placeholder={`Search ${FIELD_KINDS.length} field types...`}
									className="text-[11px]"
								/>
								<div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
									{filteredKinds.map((kind) => (
										<MappingRow
											key={kind}
											kind={kind}
											config={config}
											sample={fakerSample[kind] ?? ""}
											active={activeKind === kind}
											onFocus={() => setActiveKind(kind)}
											onChange={(pattern) =>
												update({
													overrides: {
														...config.overrides,
														[kind]: pattern,
													},
												})
											}
											onReset={() => {
												const next = {...config.overrides}
												delete next[kind]
												update({overrides: next})
											}}
										/>
									))}
								</div>
								{activeKind && (
									<div className="flex flex-col gap-1 pt-1 border-t border-(--p-border-subtle)">
										<span className="text-[9px] text-(--p-text-subdued)">
											Insert a pattern into{" "}
											<span className="font-semibold text-(--p-text)">
												{KIND_LABELS[activeKind]}
											</span>{" "}
											· {ALL_CATALOG_ITEMS.length} available
										</span>
										<div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
											{PATTERN_QUICK_PICKS.map((item) => (
												<button
													key={item.pattern}
													onClick={() =>
														update({
															overrides: {
																...config.overrides,
																[activeKind]: item.pattern,
															},
														})
													}
													title={item.pattern}
													className="px-1.5 py-0.5 rounded-md text-[10px] bg-(--p-canvas) border border-(--p-border) text-(--p-text) hover:border-[#008060] hover:text-[#008060] dark:hover:text-[#34d399] transition-colors cursor-pointer"
												>
													{item.label}
												</button>
											))}
										</div>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Paused hosts */}
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between px-0.5">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								Paused sites
							</span>
							<Button
								variant="ghost"
								size="xs"
								disabled={!tabHost || config.pausedHosts.includes(tabHost)}
								className="text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399]"
								onClick={() => {
									if (!tabHost) return
									update({pausedHosts: [...config.pausedHosts, tabHost]})
									showToast(`${tabHost} paused`, "success")
								}}
							>
								<span>Pause current site</span>
							</Button>
						</div>
						{config.pausedHosts.length === 0 ? (
							<span className="text-[9px] text-(--p-text-subdued) px-0.5">
								The gesture works everywhere. Pause sensitive sites like your
								bank or admin panels.
							</span>
						) : (
							<div className="flex flex-wrap gap-1">
								{config.pausedHosts.map((host) => (
									<button
										key={host}
										onClick={() =>
											update({
												pausedHosts: config.pausedHosts.filter(
													(item) => item !== host,
												),
											})
										}
										title="Resume on this site"
										className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] bg-(--p-canvas) border border-(--p-border) text-(--p-text) hover:border-[#f87171] hover:text-[#f87171] transition-colors cursor-pointer"
									>
										<span className="font-mono">{host}</span>
										<TrashIcon size={10} />
									</button>
								))}
							</div>
						)}
					</div>

					{/* Activity */}
					<div className="flex flex-col gap-1.5">
						<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued) px-0.5">
							Recent fills
						</span>
						{activity.length === 0 ? (
							<span className="text-[9px] text-(--p-text-subdued) px-0.5">
								Nothing filled yet in this session.
							</span>
						) : (
							<div className="flex flex-col gap-1">
								{activity.map((entry) => (
									<div
										key={entry.id}
										className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-(--p-surface) border border-(--p-border) text-[10px]"
									>
										<CheckIcon
											size={12}
											className="text-[#008060] dark:text-[#34d399] shrink-0"
										/>
										<span className="font-mono text-(--p-text) truncate">
											{entry.host}
										</span>
										<Badge variant="secondary" className="shrink-0">
											{entry.scope}
										</Badge>
										<span className="text-(--p-text-subdued) tabular-nums shrink-0">
											{entry.filled} field
											{entry.filled === 1 ? "" : "s"}
										</span>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="flex items-start gap-1.5 p-2 rounded-lg border border-(--p-border) bg-(--p-surface)">
						<HelpIcon size={13} className="text-(--p-text-subdued) mt-0.5 shrink-0" />
						<p className="text-[9px] text-(--p-text-subdued) leading-snug">
							Everything runs locally: the injected script only reads the
							fields you click or the form you target, and values are generated
							on-device from the seed above. Nothing is sent anywhere.
						</p>
					</div>
				</>
			)}
		</div>
	)
}

