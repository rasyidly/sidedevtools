import {useCallback, useEffect, useMemo, useRef, useState} from "react"
import {
	PaletteIcon,
	CopyIcon,
	CheckIcon,
	TrashIcon,
	ImageIcon,
	SparklesIcon,
	EyeIcon,
	AlertIcon,
	RefreshIcon,
	PlusIcon,
	ShieldIcon,
	MaximizeIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {Switch} from "@/components/ui/switch"
import {useToast} from "@/components/ui/toast"
import {cn} from "@/lib/utils"
import {captureRegion} from "@/lib/region-capture"
import {
	analyzeContrast,
	colorHarmony,
	DEFAULT_RAMP_OPTIONS,
	describeColor,
	extractPalette,
	formatPalette,
	formatRamp,
	formatToken,
	formatValue,
	generateNeutralScale,
	generateScale,
	nearestNamedColor,
	nearestTailwindToken,
	OUTPUT_FORMATS,
	parseColor,
	RAMP_TARGETS,
	toHex,
} from "./utils"
import type {OutputFormat, RGBA, RampOptions, RampTarget} from "./utils"

type ColorTab = "convert" | "ramp" | "pick" | "contrast"

const RECENT_KEY = "SideDevTools_color_recent"
const FORMAT_KEY = "SideDevTools_color_format"
const RAMP_KEY = "SideDevTools_color_ramp"
const FALLBACK: RGBA = {r: 0, g: 128, b: 96, a: 1}

/* ------------------------------------------------------------------ */

function loadRecent(): string[] {
	try {
		const raw = localStorage.getItem(RECENT_KEY)
		const parsed = raw ? JSON.parse(raw) : []
		return Array.isArray(parsed) ? parsed.slice(0, 18) : []
	} catch {
		return []
	}
}

function loadFormat(): OutputFormat {
	try {
		const raw = localStorage.getItem(FORMAT_KEY)
		if (raw === "oklch" || raw === "hex" || raw === "rgb" || raw === "hsl")
			return raw
	} catch {}
	return "oklch"
}

function loadRampOptions(): Required<RampOptions> {
	try {
		const raw = localStorage.getItem(RAMP_KEY)
		if (raw) {
			const parsed = JSON.parse(raw) as RampOptions
			return {...DEFAULT_RAMP_OPTIONS, ...parsed}
		}
	} catch {}
	return DEFAULT_RAMP_OPTIONS
}

function Swatch({
	color,
	label,
	subLabel,
	onClick,
	active,
}: {
	color: string
	label?: string
	subLabel?: string
	onClick?: () => void
	active?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={`${color}${label ? ` · ${label}` : ""}`}
			className={cn(
				"flex flex-col items-stretch gap-0.5 cursor-pointer group text-left",
				!onClick && "cursor-default",
			)}
		>
			<span
				className={cn(
					"h-6 w-full rounded-md border border-black/10 dark:border-white/15 transition-transform group-hover:scale-[1.04]",
					active &&
						"ring-1 ring-[#008060] ring-offset-1 ring-offset-(--p-surface)",
				)}
				style={{backgroundColor: color}}
			/>
			{label && (
				<span className="text-[9px] leading-none text-(--p-text-subdued) tabular-nums truncate">
					{label}
				</span>
			)}
			{subLabel && (
				<span className="text-[9px] leading-none font-mono text-(--p-text-subdued) truncate">
					{subLabel}
				</span>
			)}
		</button>
	)
}

function CopyValue({
	label,
	value,
	onCopy,
	mono = true,
}: {
	label: string
	value: string
	onCopy: (value: string) => void
	mono?: boolean
}) {
	return (
		<div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-(--p-canvas) border border-(--p-border)">
			<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued) w-14 shrink-0">
				{label}
			</span>
			<span
				className={cn(
					"flex-1 text-[11px] text-(--p-text) truncate",
					mono && "font-mono",
				)}
			>
				{value}
			</span>
			<button
				onClick={() => onCopy(value)}
				title={`Copy ${label}`}
				className="p-1 text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] transition-colors cursor-pointer shrink-0"
			>
				<CopyIcon size={14} />
			</button>
		</div>
	)
}

function FormatChips({
	value,
	onChange,
	className,
}: {
	value: OutputFormat
	onChange: (format: OutputFormat) => void
	className?: string
}) {
	return (
		<div
			className={cn(
				"flex items-center gap-0.5 p-0.5 rounded-lg bg-(--p-surface-subdued) border border-(--p-border)",
				className,
			)}
		>
			{OUTPUT_FORMATS.map((format) => (
				<button
					key={format.id}
					type="button"
					onClick={() => onChange(format.id)}
					aria-pressed={value === format.id}
					className={cn(
						"px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008060]/70",
						value === format.id
							? "bg-(--p-surface) text-[#008060] dark:text-[#34d399] font-semibold shadow-xs"
							: "text-(--p-text-subdued) hover:text-(--p-text)",
					)}
				>
					{format.label}
				</button>
			))}
		</div>
	)
}

function SliderControl({
	label,
	value,
	min,
	max,
	step,
	display,
	onChange,
}: {
	label: string
	value: number
	min: number
	max: number
	step: number
	display: string
	onChange: (value: number) => void
}) {
	return (
		<label className="flex items-center gap-2 cursor-pointer select-none">
			<span className="text-[10px] text-(--p-text-subdued) w-16 shrink-0">
				{label}
			</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="flex-1 accent-[#008060] cursor-pointer"
			/>
			<span className="text-[10px] font-mono tabular-nums text-(--p-text) w-11 text-right shrink-0">
				{display}
			</span>
		</label>
	)
}

/* ------------------------------------------------------------------ */

export function ColorToolkitView() {
	const [tab, setTab] = useState<ColorTab>("convert")
	const [text, setText] = useState("#008060")
	const [recent, setRecent] = useState<string[]>(loadRecent)
	const [alphaHex, setAlphaHex] = useState(false)
	const [valueFormat, setValueFormat] = useState<OutputFormat>(loadFormat)
	const [rampOptions, setRampOptions] =
		useState<Required<RampOptions>>(loadRampOptions)
	const [showNeutral, setShowNeutral] = useState(false)
	const [rampTarget, setRampTarget] = useState<RampTarget>("tailwind")
	const {showToast} = useToast()

	// Palette extraction
	const [imageSrc, setImageSrc] = useState<string | null>(null)
	const [imageData, setImageData] = useState<ImageData | null>(null)
	const [paletteCount, setPaletteCount] = useState(6)
	const [paletteSeed, setPaletteSeed] = useState(0)

	// Screen picking
	const [picked, setPicked] = useState<string | null>(null)
	const [capturing, setCapturing] = useState(false)

	// Contrast
	const [fgText, setFgText] = useState("#202223")
	const [bgText, setBgText] = useState("#ffffff")

	const fileInputRef = useRef<HTMLInputElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)

	const base = useMemo(() => parseColor(text) ?? FALLBACK, [text])
	const channels = useMemo(() => describeColor(base), [base])
	const scale = useMemo(
		() => generateScale(base, rampOptions),
		[base, rampOptions],
	)
	const neutralScale = useMemo(
		() => generateNeutralScale(base, rampOptions),
		[base, rampOptions],
	)
	const harmony = useMemo(() => colorHarmony(base), [base])
	const named = useMemo(() => nearestNamedColor(base), [base])
	const token = useMemo(() => nearestTailwindToken(base), [base])
	const palette = useMemo(
		() =>
			imageData
				? extractPalette(imageData.data, paletteCount, paletteSeed)
				: [],
		[imageData, paletteCount, paletteSeed],
	)

	const fg = useMemo(
		() => parseColor(fgText) ?? {r: 0, g: 0, b: 0, a: 1},
		[fgText],
	)
	const bg = useMemo(
		() => parseColor(bgText) ?? {r: 255, g: 255, b: 255, a: 1},
		[bgText],
	)
	const contrast = useMemo(() => analyzeContrast(fg, bg), [fg, bg])

	const themeToken = useMemo(
		() => `@theme {\n${formatToken(channels.hex, valueFormat, "brand")}\n}`,
		[channels.hex, valueFormat],
	)

	const rampPreview = useMemo(() => {
		const body = [
			formatRamp(scale, rampTarget, valueFormat, "brand"),
			showNeutral
				? formatRamp(
						neutralScale,
						rampTarget,
						valueFormat,
						"brand-neutral",
					)
				: "",
		]
			.filter(Boolean)
			.join("\n")
		if (rampTarget === "tailwind") return `@theme {\n${body}\n}`
		if (rampTarget === "css") return `:root {\n${body}\n}`
		return body
	}, [scale, neutralScale, rampTarget, valueFormat, showNeutral])

	useEffect(() => {
		try {
			localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
		} catch {}
	}, [recent])

	useEffect(() => {
		try {
			localStorage.setItem(FORMAT_KEY, valueFormat)
		} catch {}
	}, [valueFormat])

	useEffect(() => {
		try {
			localStorage.setItem(RAMP_KEY, JSON.stringify(rampOptions))
		} catch {}
	}, [rampOptions])

	const pushRecent = useCallback((hex: string) => {
		setRecent((prev) =>
			[hex, ...prev.filter((c) => c !== hex)].slice(0, 18),
		)
	}, [])

	const copy = useCallback(
		(value: string, message = "Copied to clipboard") => {
			if (!value) return
			navigator.clipboard.writeText(value)
			showToast(message, "success")
		},
		[showToast],
	)

	const setAll = useCallback(
		(hex: string) => {
			setText(hex)
			pushRecent(hex)
		},
		[pushRecent],
	)

	/* ---- palette extraction ---- */

	const ingestImage = useCallback(
		(
			src: string,
			then?: (rgba: {r: number; g: number; b: number}) => void,
		) => {
			const img = new Image()
			img.crossOrigin = "anonymous"
			img.onload = () => {
				const canvas =
					canvasRef.current ?? document.createElement("canvas")
				const maxSide = 480
				const ratio = Math.min(
					1,
					maxSide / Math.max(img.width, img.height),
				)
				canvas.width = Math.max(1, Math.round(img.width * ratio))
				canvas.height = Math.max(1, Math.round(img.height * ratio))
				const ctx = canvas.getContext("2d", {willReadFrequently: true})
				if (!ctx) return
				ctx.clearRect(0, 0, canvas.width, canvas.height)
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
				const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
				setImageSrc(src)
				setImageData(data)
				if (then) {
					const center = ctx.getImageData(
						Math.floor(canvas.width / 2),
						Math.floor(canvas.height / 2),
						1,
						1,
					).data
					then({r: center[0], g: center[1], b: center[2]})
				}
			}
			img.onerror = () => showToast("Could not read that image", "error")
			img.src = src
		},
		[showToast],
	)

	const handleFiles = useCallback(
		(files: FileList | null) => {
			const file = files?.[0]
			if (!file || !file.type.startsWith("image/")) return
			const reader = new FileReader()
			reader.onload = () => ingestImage(String(reader.result))
			reader.readAsDataURL(file)
		},
		[ingestImage],
	)

	/* ---- screen picking ---- */

	const handleEyeDropper = async () => {
		const EyeDropperCtor = (
			window as unknown as {
				EyeDropper?: new () => {open: () => Promise<{sRGBHex: string}>}
			}
		).EyeDropper
		if (!EyeDropperCtor) {
			showToast(
				"EyeDropper is unavailable here — capture the tab instead",
				"error",
			)
			return
		}
		try {
			const result = await new EyeDropperCtor().open()
			setPicked(result.sRGBHex)
			setText(result.sRGBHex)
			pushRecent(result.sRGBHex)
			showToast("Picked " + result.sRGBHex, "success")
		} catch {
			/* user cancelled */
		}
	}

	const handleCaptureRegion = async () => {
		setCapturing(true)
		try {
			const region = await captureRegion()
			if (!region) return // user cancelled
			ingestImage(region.dataUrl, (rgb) =>
				setPicked(toHex({...rgb, a: 1})),
			)
			showToast(
				"Region captured — click any pixel to sample it",
				"success",
			)
		} catch (error) {
			showToast(
				error instanceof Error ? error.message : "Capture failed",
				"error",
			)
		} finally {
			setCapturing(false)
		}
	}

	const pickFromImage = (event: React.MouseEvent<HTMLImageElement>) => {
		if (!imageData) return
		const img = event.currentTarget
		const rect = img.getBoundingClientRect()
		const x = Math.floor(
			((event.clientX - rect.left) / rect.width) * imageData.width,
		)
		const y = Math.floor(
			((event.clientY - rect.top) / rect.height) * imageData.height,
		)
		const offset = (y * imageData.width + x) * 4
		const hex = toHex({
			r: imageData.data[offset],
			g: imageData.data[offset + 1],
			b: imageData.data[offset + 2],
			a: 1,
		})
		setPicked(hex)
		pushRecent(hex)
	}

	/* ---- render ---- */

	const tabs: {id: ColorTab; label: string}[] = [
		{id: "convert", label: "Convert"},
		{id: "ramp", label: "Ramp"},
		{id: "pick", label: "Pick"},
		{id: "contrast", label: "Contrast"},
	]

	return (
		<div className="flex flex-col gap-3 p-3">
			<canvas ref={canvasRef} className="hidden" />

			{/* Tabs */}
			<div className="grid grid-cols-4 gap-1 p-0.5 bg-(--p-surface-subdued) border border-(--p-border) rounded-lg">
				{tabs.map((t) => (
					<button
						key={t.id}
						onClick={() => setTab(t.id)}
						className={cn(
							"py-1 text-center font-medium uppercase text-[11px] rounded-lg transition-all cursor-pointer",
							tab === t.id
								? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
								: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)",
						)}
					>
						{t.label}
					</button>
				))}
			</div>

			{/* Color field — shared across tabs */}
			<div className="flex items-center gap-2">
				<label
					className="relative h-9 w-9 shrink-0 rounded-lg border border-(--p-border) overflow-hidden cursor-pointer shadow-xs"
					style={{backgroundColor: channels.hex}}
					title="Open native color picker"
				>
					<input
						type="color"
						value={channels.hex}
						onChange={(e) => setAll(e.target.value)}
						className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
					/>
				</label>
				<Input
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="#008060, rgb(0 128 96), oklch(59% 0.11 165)"
					className="font-mono text-[11px]"
					spellCheck={false}
				/>
				<Button
					variant="ghost"
					size="icon-sm"
					title="Reset"
					onClick={() => setText("#008060")}
					className="shrink-0"
				>
					<RefreshIcon size={15} />
				</Button>
			</div>

			{!parseColor(text) && text.trim() !== "" && (
				<div className="flex items-center gap-1.5 p-2 rounded-lg bg-[#2d1518] border border-[#522327] text-[#f87171] text-[11px]">
					<AlertIcon size={15} className="shrink-0" />
					<span className="truncate">
						Unrecognized color format — try hex, rgb(), hsl(),
						hsv(), oklch() or a CSS name
					</span>
				</div>
			)}

			{/* Recent colors */}
			{recent.length > 0 && (
				<div className="flex items-center gap-1.5">
					<span className="text-[10px] uppercase tracking-wider text-(--p-text-subdued) shrink-0">
						Recent
					</span>
					<div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
						{recent.map((hex) => (
							<button
								key={hex}
								onClick={() => setText(hex)}
								title={hex}
								className={cn(
									"h-4 w-4 rounded-md border border-black/10 dark:border-white/15 shrink-0 cursor-pointer transition-transform hover:scale-110",
									hex === channels.hex &&
										"ring-1 ring-[#008060] ring-offset-1 ring-offset-(--p-canvas)",
								)}
								style={{backgroundColor: hex}}
							/>
						))}
						<button
							onClick={() => setRecent([])}
							title="Clear recent colors"
							className="p-0.5 text-(--p-text-subdued) hover:text-[#f87171] shrink-0 cursor-pointer"
						>
							<TrashIcon size={12} />
						</button>
					</div>
				</div>
			)}

			{/* ------------------------------------------------ Convert */}
			{tab === "convert" && (
				<div className="flex flex-col gap-2.5 animate-card-entrance">
					<div
						className="h-14 rounded-lg border border-(--p-border) flex items-end justify-between p-1.5"
						style={{backgroundColor: channels.hex}}
					>
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-black/45 text-white truncate">
							{formatValue(channels.hex, valueFormat)}
						</span>
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-black/45 text-white shrink-0">
							{channels.hex}
						</span>
					</div>

					<div className="flex items-center justify-between gap-1.5">
						<FormatChips
							value={valueFormat}
							onChange={setValueFormat}
						/>
						<label className="flex items-center gap-1.5 text-[11px] text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer select-none">
							<Switch
								size="sm"
								checked={alphaHex}
								onCheckedChange={setAlphaHex}
							/>
							<span>Alpha</span>
						</label>
					</div>

					<div className="flex flex-col gap-1.5">
						<CopyValue
							label="HEX"
							value={alphaHex ? channels.hexAlpha : channels.hex}
							onCopy={(v) => copy(v)}
						/>
						<CopyValue
							label="RGB"
							value={channels.rgb}
							onCopy={(v) => copy(v)}
						/>
						<CopyValue
							label="HSL"
							value={channels.hsl}
							onCopy={(v) => copy(v)}
						/>
						<CopyValue
							label="HSV"
							value={channels.hsv}
							onCopy={(v) => copy(v)}
						/>
						<CopyValue
							label="OKLCH"
							value={channels.oklch}
							onCopy={(v) => copy(v)}
						/>
						<CopyValue
							label="OKLAB"
							value={channels.oklab}
							onCopy={(v) => copy(v)}
						/>
					</div>

					{/* Tailwind v4 @theme token */}
					<div className="flex flex-col gap-1.5 rounded-lg border border-(--p-border) bg-(--p-surface) p-2.5">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								Tailwind v4 token
							</span>
							<button
								onClick={() =>
									copy(
										themeToken,
										"Tailwind @theme token copied",
									)
								}
								title="Copy @theme block"
								className="flex items-center gap-1 text-[10px] text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] cursor-pointer transition-colors"
							>
								<CopyIcon size={13} />
								<span>Copy</span>
							</button>
						</div>
						<pre className="p-2 rounded-lg bg-(--p-canvas) border border-(--p-border) text-[10px] font-mono text-(--p-text) whitespace-pre-wrap break-all">
							{themeToken}
						</pre>
						<button
							onClick={() =>
								copy(
									`${token.family}-${token.shade} (${token.hex})`,
									"Nearest Tailwind token copied",
								)
							}
							title="Nearest Tailwind token"
							className="flex items-center gap-1 self-start text-[10px] text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] cursor-pointer transition-colors"
						>
							<SparklesIcon size={12} />
							<span>
								Nearest:{" "}
								<span className="font-mono">
									{token.family}-{token.shade}
								</span>
							</span>
						</button>
					</div>

					<div className="flex flex-col gap-1.5 rounded-lg border border-(--p-border) bg-(--p-surface) p-2.5">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								Details
							</span>
							<Badge variant="secondary" className="font-mono">
								L* {channels.luminance}
							</Badge>
						</div>
						<div className="grid grid-cols-2 gap-1.5 text-[10px]">
							<div className="flex items-baseline gap-1.5 px-2 py-1 rounded-lg bg-(--p-canvas) border border-(--p-border)">
								<span className="text-(--p-text-subdued) shrink-0">
									Named
								</span>
								<button
									onClick={() =>
										copy(named.name, "Color name copied")
									}
									className="font-mono text-(--p-text) truncate hover:text-[#008060] dark:hover:text-[#34d399] cursor-pointer"
									title={`${named.hex} — click to copy name`}
								>
									{named.name}
								</button>
							</div>
							<div className="flex items-baseline gap-1.5 px-2 py-1 rounded-lg bg-(--p-canvas) border border-(--p-border)">
								<span className="text-(--p-text-subdued) shrink-0">
									Tailwind
								</span>
								<span className="font-mono text-(--p-text) truncate">
									{token.family}-{token.shade}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-1 pt-0.5">
							{harmony.map((h) => (
								<button
									key={h.role}
									onClick={() => setAll(h.hex)}
									title={`${h.role} · ${h.hex}`}
									className="flex-1 h-5 rounded-md border border-black/10 dark:border-white/15 cursor-pointer transition-transform hover:scale-105"
									style={{backgroundColor: h.hex}}
								/>
							))}
						</div>
						<span className="text-[9px] text-(--p-text-subdued)">
							Harmony: base, complement, analogous ±30°, triad —
							click to adopt
						</span>
					</div>

					<Button
						variant="secondary"
						size="sm"
						onClick={() =>
							copy(
								formatValue(channels.hex, valueFormat),
								`${valueFormat.toUpperCase()} value copied`,
							)
						}
					>
						<CopyIcon size={14} />
						<span>Copy {valueFormat.toUpperCase()} value</span>
					</Button>
				</div>
			)}

			{/* --------------------------------------------------- Ramp */}
			{tab === "ramp" && (
				<div className="flex flex-col gap-2.5 animate-card-entrance">
					<div className="flex items-center gap-0.5 overflow-hidden rounded-lg border border-(--p-border)">
						{scale.map((step) => (
							<button
								key={step.shade}
								onClick={() =>
									copy(
										formatValue(step.hex, valueFormat),
										`${step.shade} copied`,
									)
								}
								title={`${step.shade} · ${step.hex}`}
								className="flex-1 h-8 cursor-pointer hover:h-9 transition-all"
								style={{backgroundColor: step.hex}}
							/>
						))}
					</div>

					<div className="flex items-center justify-between gap-2 text-[10px] text-(--p-text-subdued) px-0.5">
						<span className="uppercase tracking-wider shrink-0">
							Ramp 50 → 950
						</span>
						<span className="font-mono truncate">
							{formatValue(channels.hex, valueFormat)}
						</span>
					</div>

					{/* Ramp controls */}
					<div className="flex flex-col gap-2 rounded-lg border border-(--p-border) bg-(--p-surface) p-2.5">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								Ramp controls
							</span>
							<Button
								variant="ghost"
								size="xs"
								className="text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399]"
								title="Reset ramp controls"
								onClick={() =>
									setRampOptions(DEFAULT_RAMP_OPTIONS)
								}
							>
								<RefreshIcon size={13} />
								<span>Reset</span>
							</Button>
						</div>
						<SliderControl
							label="Hue shift"
							value={rampOptions.hueShift}
							min={-60}
							max={60}
							step={1}
							display={`${rampOptions.hueShift > 0 ? "+" : ""}${rampOptions.hueShift}°`}
							onChange={(v) =>
								setRampOptions((p) => ({...p, hueShift: v}))
							}
						/>
						<SliderControl
							label="Chroma"
							value={rampOptions.chroma}
							min={0.4}
							max={1.6}
							step={0.05}
							display={`${Math.round(rampOptions.chroma * 100)}%`}
							onChange={(v) =>
								setRampOptions((p) => ({...p, chroma: v}))
							}
						/>
						<SliderControl
							label="Lightness"
							value={rampOptions.lightness}
							min={-0.12}
							max={0.12}
							step={0.01}
							display={`${rampOptions.lightness > 0 ? "+" : ""}${Math.round(rampOptions.lightness * 100)}`}
							onChange={(v) =>
								setRampOptions((p) => ({...p, lightness: v}))
							}
						/>
						<label className="flex items-center gap-1.5 text-[11px] text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer select-none pt-0.5">
							<Switch
								size="sm"
								checked={showNeutral}
								onCheckedChange={setShowNeutral}
							/>
							<span>Pair a neutral companion scale</span>
						</label>
					</div>

					{showNeutral && (
						<div className="flex flex-col gap-1">
							<div className="flex items-center justify-between px-0.5">
								<span className="text-[10px] uppercase tracking-wider text-(--p-text-subdued)">
									Neutral companion
								</span>
								<button
									onClick={() =>
										copy(
											formatRamp(
												neutralScale,
												"list",
												valueFormat,
											),
											"Neutral scale copied",
										)
									}
									className="text-[10px] text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] cursor-pointer transition-colors"
								>
									Copy
								</button>
							</div>
							<div className="flex items-center gap-0.5 overflow-hidden rounded-lg border border-(--p-border)">
								{neutralScale.map((step) => (
									<button
										key={step.shade}
										onClick={() => setAll(step.hex)}
										title={`${step.shade} · ${step.hex}`}
										className="flex-1 h-5 cursor-pointer hover:h-6 transition-all"
										style={{backgroundColor: step.hex}}
									/>
								))}
							</div>
						</div>
					)}

					<div className="flex flex-col rounded-lg border border-(--p-border) bg-(--p-surface) divide-y divide-(--p-border-subtle) overflow-hidden">
						{scale.map((step) => (
							<div
								key={step.shade}
								className="group flex items-center gap-2 p-1.5 hover:bg-(--p-surface-hover) transition-colors"
							>
								<button
									onClick={() => setAll(step.hex)}
									title="Set as base color"
									className="h-5 w-9 rounded-md border border-black/10 dark:border-white/15 shrink-0 cursor-pointer"
									style={{backgroundColor: step.hex}}
								/>
								<span className="text-[10px] font-semibold text-(--p-text-subdued) w-7 tabular-nums">
									{step.shade}
								</span>
								<button
									onClick={() =>
										copy(formatValue(step.hex, valueFormat))
									}
									className="flex-1 text-left text-[11px] font-mono text-(--p-text) truncate cursor-pointer hover:text-[#008060] dark:hover:text-[#34d399] transition-colors"
								>
									{step.hex}
								</button>
								<span className="hidden group-hover:block text-[10px] font-mono text-(--p-text-subdued) truncate max-w-24">
									{formatValue(step.hex, valueFormat)}
								</span>
								<button
									onClick={() =>
										copy(
											formatValue(step.hex, valueFormat),
											`${valueFormat.toUpperCase()} copied`,
										)
									}
									className="p-0.5 text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] shrink-0 cursor-pointer"
									title={`Copy ${valueFormat.toUpperCase()}`}
								>
									<CopyIcon size={13} />
								</button>
							</div>
						))}
					</div>

					{/* Export */}
					<div className="flex flex-col gap-1.5 rounded-lg border border-(--p-border) bg-(--p-surface) p-2.5">
						<div className="flex items-center justify-between gap-1.5">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued) shrink-0">
								Export ramp
							</span>
							<FormatChips
								value={valueFormat}
								onChange={setValueFormat}
							/>
						</div>
						<div className="flex flex-wrap gap-1">
							{RAMP_TARGETS.map((target) => (
								<button
									key={target.id}
									type="button"
									onClick={() => setRampTarget(target.id)}
									aria-pressed={rampTarget === target.id}
									className={cn(
										"px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008060]/70",
										rampTarget === target.id
											? "bg-[#008060]! text-white border-[#005e46] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
											: "bg-(--p-surface) text-(--p-text-subdued) border-(--p-border) hover:text-(--p-text)",
									)}
								>
									{target.label}
								</button>
							))}
						</div>
						<pre className="p-2 rounded-lg bg-(--p-canvas) border border-(--p-border) text-[10px] font-mono text-(--p-text) whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
							{rampPreview}
						</pre>
						<Button
							variant="secondary"
							size="sm"
							onClick={() =>
								copy(
									rampPreview,
									`${
										RAMP_TARGETS.find(
											(t) => t.id === rampTarget,
										)?.label ?? "Ramp"
									} copied`,
								)
							}
						>
							<CopyIcon size={14} />
							<span>
								Copy{" "}
								{RAMP_TARGETS.find((t) => t.id === rampTarget)
									?.label ?? "ramp"}
							</span>
						</Button>
					</div>

					{/* Palette from image */}
					<div className="flex flex-col gap-2 rounded-lg border border-(--p-border) bg-(--p-surface) p-2.5">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								Extract from image
							</span>
							<div className="flex items-center gap-1.5">
								<span className="text-[10px] text-(--p-text-subdued) tabular-nums">
									{paletteCount}
								</span>
								<input
									type="range"
									min={3}
									max={10}
									value={paletteCount}
									onChange={(e) =>
										setPaletteCount(Number(e.target.value))
									}
									className="w-16 accent-[#008060] cursor-pointer"
								/>
							</div>
						</div>

						<div
							onPaste={(e) => {
								const item = [...e.clipboardData.items].find(
									(i) => i.type.startsWith("image/"),
								)
								const file = item?.getAsFile()
								if (file) {
									const reader = new FileReader()
									reader.onload = () =>
										ingestImage(String(reader.result))
									reader.readAsDataURL(file)
								}
							}}
							onDragOver={(e) => e.preventDefault()}
							onDrop={(e) => {
								e.preventDefault()
								handleFiles(e.dataTransfer.files)
							}}
							className="flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-(--p-border) text-[10px] text-(--p-text-subdued) hover:border-[#008060] hover:text-(--p-text) transition-colors"
						>
							<ImageIcon size={14} />
							<span>Paste, drop or</span>
							<button
								onClick={() => fileInputRef.current?.click()}
								className="underline underline-offset-2 hover:text-[#008060] dark:hover:text-[#34d399] cursor-pointer"
							>
								browse image
							</button>
						</div>

						{imageSrc && (
							<img
								src={imageSrc}
								alt="Palette source"
								onClick={pickFromImage}
								className="w-full max-h-28 object-contain rounded-lg border border-(--p-border) bg-(--p-canvas) cursor-crosshair"
							/>
						)}

						{palette.length > 0 && (
							<>
								<div className="grid grid-cols-6 gap-1">
									{palette.map((color) => (
										<Swatch
											key={color.hex}
											color={color.hex}
											subLabel={color.hex.replace(
												"#",
												"",
											)}
											onClick={() => setAll(color.hex)}
										/>
									))}
								</div>
								<div className="flex items-center gap-1.5">
									<Button
										variant="secondary"
										size="xs"
										onClick={() =>
											copy(
												palette
													.map((c) => c.hex)
													.join("\n"),
												"Palette copied",
											)
										}
									>
										<CopyIcon size={13} />
										<span>Copy hex list</span>
									</Button>
									<Button
										variant="secondary"
										size="xs"
										onClick={() =>
											copy(
												formatPalette(
													palette.map((c) => c.hex),
													"css",
												),
												"CSS variables copied",
											)
										}
									>
										<span>CSS vars</span>
									</Button>
									<Button
										variant="secondary"
										size="xs"
										onClick={() =>
											copy(
												formatPalette(
													palette.map((c) => c.hex),
													"json",
												),
												"JSON copied",
											)
										}
									>
										<span>JSON</span>
									</Button>
									<Button
										variant="ghost"
										size="icon-xs"
										title="Re-cluster"
										className="ml-auto"
										onClick={() =>
											setPaletteSeed((s) => s + 1)
										}
									>
										<RefreshIcon size={14} />
									</Button>
								</div>
								<span className="text-[9px] text-(--p-text-subdued) tabular-nums">
									k-means over OKLab ·{" "}
									{palette
										.slice(0, 3)
										.map(
											(c) =>
												`${Math.round(c.ratio * 100)}%`,
										)
										.join(" · ")}{" "}
									of pixels
								</span>
							</>
						)}
					</div>
				</div>
			)}

			{/* --------------------------------------------------- Pick */}
			{tab === "pick" && (
				<div className="flex flex-col gap-2.5 animate-card-entrance">
					<div className="grid grid-cols-2 gap-1.5">
						<Button
							size="sm"
							onClick={handleCaptureRegion}
							disabled={capturing}
							title="Drag a box over part of the page to capture it"
						>
							<MaximizeIcon size={14} />
							<span>
								{capturing ? "Capturing…" : "Capture region"}
							</span>
						</Button>
						<Button
							variant="secondary"
							size="sm"
							onClick={handleEyeDropper}
							title="Pick any pixel on screen (EyeDropper)"
						>
							<EyeIcon size={14} />
							<span>Screen picker</span>
						</Button>
					</div>

					{picked && (
						<div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-(--p-border) bg-(--p-surface) animate-card-entrance">
							<span
								className="h-12 w-12 rounded-lg border border-black/10 dark:border-white/15 shrink-0"
								style={{backgroundColor: picked}}
							/>
							<div className="flex flex-col gap-0.5 min-w-0">
								<span className="text-[11px] font-mono font-semibold text-(--p-text)">
									{picked}
								</span>
								{(() => {
									const parsed = parseColor(picked)
									if (!parsed) return null
									const info = describeColor(parsed)
									return (
										<span className="text-[10px] text-(--p-text-subdued) font-mono truncate">
											{info.rgb} · {info.oklch}
										</span>
									)
								})()}
							</div>
							<div className="flex items-center gap-1 ml-auto shrink-0">
								<Button
									variant="ghost"
									size="icon-sm"
									title="Copy"
									onClick={() => copy(picked)}
								>
									<CopyIcon size={15} />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									title="Use as base color"
									onClick={() => setAll(picked)}
								>
									<PlusIcon size={15} />
								</Button>
							</div>
						</div>
					)}

					<div className="flex flex-col gap-2 rounded-lg border border-(--p-border) bg-(--p-surface) p-2.5">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								Captured region
							</span>
							{imageSrc && (
								<button
									onClick={() => {
										setImageSrc(null)
										setImageData(null)
									}}
									className="text-[10px] text-(--p-text-subdued) hover:text-[#f87171] cursor-pointer transition-colors"
								>
									Clear
								</button>
							)}
						</div>

						{imageSrc ? (
							<>
								<img
									src={imageSrc}
									alt="Captured region"
									onClick={pickFromImage}
									className="w-full max-h-48 object-contain rounded-lg border border-(--p-border) bg-(--p-canvas) cursor-crosshair"
								/>
								<span className="text-[9px] text-(--p-text-subdued)">
									Click any pixel to sample its exact color
								</span>
							</>
						) : (
							<p className="text-[10px] text-(--p-text-subdued)">
								Press{" "}
								<span className="font-medium text-(--p-text)">
									Capture region
								</span>{" "}
								and drag a box over any part of the page — the
								selection lands here so you can sample
								individual pixels. Use the screen picker for
								pixels outside the browser.
							</p>
						)}
					</div>
				</div>
			)}

			{/* ----------------------------------------------- Contrast */}
			{tab === "contrast" && (
				<div className="flex flex-col gap-2.5 animate-card-entrance">
					<div className="grid grid-cols-2 gap-1.5">
						<div className="flex flex-col gap-1">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								Text
							</span>
							<div className="flex items-center gap-1.5">
								<label
									className="h-7 w-7 shrink-0 rounded-lg border border-(--p-border) overflow-hidden cursor-pointer"
									style={{backgroundColor: toHex(fg)}}
								>
									<input
										type="color"
										value={toHex(fg)}
										onChange={(e) =>
											setFgText(e.target.value)
										}
										className="h-full w-full opacity-0 cursor-pointer"
									/>
								</label>
								<Input
									value={fgText}
									onChange={(e) => setFgText(e.target.value)}
									className="font-mono text-[10px]"
								/>
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								Background
							</span>
							<div className="flex items-center gap-1.5">
								<label
									className="h-7 w-7 shrink-0 rounded-lg border border-(--p-border) overflow-hidden cursor-pointer"
									style={{backgroundColor: toHex(bg)}}
								>
									<input
										type="color"
										value={toHex(bg)}
										onChange={(e) =>
											setBgText(e.target.value)
										}
										className="h-full w-full opacity-0 cursor-pointer"
									/>
								</label>
								<Input
									value={bgText}
									onChange={(e) => setBgText(e.target.value)}
									className="font-mono text-[10px]"
								/>
							</div>
						</div>
					</div>

					<div
						className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-lg border border-(--p-border)"
						style={{backgroundColor: toHex(bg)}}
					>
						<span
							className="text-sm font-semibold"
							style={{color: toHex(fg)}}
						>
							Design-checked contrast
						</span>
						<span
							className="text-[11px]"
							style={{color: toHex(fg)}}
						>
							The quick brown fox jumps over the lazy dog
						</span>
						<span
							className="text-[9px] opacity-80"
							style={{color: toHex(fg)}}
						>
							Text that stays legible for everyone
						</span>
					</div>

					<div className="flex items-center gap-1.5">
						<Button
							variant="secondary"
							size="xs"
							onClick={() => {
								setFgText(toHex(bg))
								setBgText(toHex(fg))
							}}
						>
							<RefreshIcon size={13} />
							<span>Swap</span>
						</Button>
						<Button
							variant="ghost"
							size="xs"
							onClick={() => setFgText(channels.hex)}
						>
							<span>Text ← base</span>
						</Button>
						<Button
							variant="ghost"
							size="xs"
							onClick={() => setBgText(channels.hex)}
							className="ml-auto"
						>
							<span>BG ← base</span>
						</Button>
					</div>

					<div className="flex flex-col gap-2 rounded-lg border border-(--p-border) bg-(--p-surface) p-2.5">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								WCAG 2.2 ratio
							</span>
							<span className="text-base font-semibold text-(--p-text) tabular-nums">
								{contrast.ratio.toFixed(2)}
								<span className="text-[10px] text-(--p-text-subdued)">
									:1
								</span>
							</span>
						</div>
						<div className="grid grid-cols-2 gap-1.5">
							{[
								{
									label: "AA · normal",
									pass: contrast.aaNormal,
									hint: "4.5:1",
								},
								{
									label: "AA · large",
									pass: contrast.aaLarge,
									hint: "3:1",
								},
								{
									label: "AAA · normal",
									pass: contrast.aaaNormal,
									hint: "7:1",
								},
								{
									label: "AAA · large",
									pass: contrast.aaaLarge,
									hint: "4.5:1",
								},
							].map((item) => (
								<div
									key={item.label}
									className="flex items-center justify-between px-2 py-1 rounded-lg bg-(--p-canvas) border border-(--p-border)"
								>
									<span className="text-[10px] text-(--p-text)">
										{item.label}
									</span>
									<span className="flex items-center gap-1">
										<span className="text-[9px] text-(--p-text-subdued) tabular-nums">
											{item.hint}
										</span>
										{item.pass ? (
											<CheckIcon
												size={13}
												className="text-[#008060] dark:text-[#34d399]"
											/>
										) : (
											<AlertIcon
												size={13}
												className="text-[#f87171]"
											/>
										)}
									</span>
								</div>
							))}
						</div>

						<div className="flex items-center justify-between pt-0.5">
							<span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-(--p-text-subdued)">
								<ShieldIcon size={12} />
								APCA Lc
							</span>
							<div className="flex items-center gap-1.5">
								<Badge
									variant={
										Math.abs(contrast.apca) >= 75
											? "success"
											: Math.abs(contrast.apca) >= 60
												? "attention"
												: "critical"
									}
								>
									{contrast.apca > 0 ? "+" : ""}
									{contrast.apca}
								</Badge>
								<span className="text-[9px] text-(--p-text-subdued)">
									{Math.abs(contrast.apca) >= 90
										? "Excellent for body text"
										: Math.abs(contrast.apca) >= 75
											? "Good for body text"
											: Math.abs(contrast.apca) >= 60
												? "Large text / headings only"
												: Math.abs(contrast.apca) >= 45
													? "Non-text / decorative"
													: "Insufficient"}
								</span>
							</div>
						</div>
					</div>

					<div className="flex items-center justify-between gap-1.5">
						<Button
							variant="secondary"
							size="xs"
							onClick={() =>
								copy(
									`--color-fg: ${formatValue(fg, valueFormat)};\n--color-bg: ${formatValue(bg, valueFormat)};\n/* WCAG ${contrast.ratio.toFixed(2)}:1 · APCA Lc ${contrast.apca} */`,
									"Pair copied",
								)
							}
						>
							<CopyIcon size={13} />
							<span>Copy pair</span>
						</Button>
						<span className="text-[9px] text-(--p-text-subdued) text-right">
							WCAG for compliance, APCA for how it truly reads
						</span>
					</div>
				</div>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(e) => handleFiles(e.target.files)}
			/>

			<div className="flex items-center gap-1.5 text-[9px] text-(--p-text-subdued) pt-1">
				<PaletteIcon size={12} />
				<span>
					OKLab math, WCAG + APCA and k-means clustering run entirely
					on-device.
				</span>
			</div>
		</div>
	)
}
