import {useState, useEffect} from "react"
import {
	GlobeIcon,
	RefreshIcon,
	CopyIcon,
	CheckIcon,
	CodeIcon,
	AlertIcon,
	SparklesIcon,
	DocumentIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {Input, Textarea} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {useToast} from "@/components/ui/toast"
import {
	type MetaData,
	DEFAULT_META_DATA,
	extractPageMeta,
	generateMetaHtml,
} from "./utils"

type MetaTab = "preview" | "builder" | "code"

export function MetaOgCheckerView() {
	const [meta, setMeta] = useState<MetaData>(DEFAULT_META_DATA)
	const [activeTab, setActiveTab] = useState<MetaTab>("preview")
	const [isLoading, setIsLoading] = useState(false)
	const [copiedHtml, setCopiedHtml] = useState(false)
	const {showToast} = useToast()

	const fetchMetaFromTab = async () => {
		setIsLoading(true)
		try {
			if (
				typeof chrome !== "undefined" &&
				chrome.tabs &&
				chrome.scripting
			) {
				// In Chrome Side Panel, querying currentWindow can sometimes reference the side panel frame.
				// Query lastFocusedWindow first, with fallback to all active tabs.
				let [tab] = await chrome.tabs.query({
					active: true,
					lastFocusedWindow: true,
				})

				if (!tab) {
					const tabs = await chrome.tabs.query({active: true})
					tab = tabs[0]
				}

				if (!tab || !tab.id) {
					throw new Error("No active web tab found")
				}

				if (
					tab.url?.startsWith("chrome://") ||
					tab.url?.startsWith("edge://") ||
					tab.url?.startsWith("chrome-extension://")
				) {
					showToast(
						"Cannot inspect browser system pages. Try on any website tab.",
						"info",
					)
					setIsLoading(false)
					return
				}

				const results = await chrome.scripting.executeScript({
					target: {tabId: tab.id},
					func: extractPageMeta,
				})

				if (results && results[0] && results[0].result) {
					setMeta(results[0].result as MetaData)
					showToast("Meta tags fetched from active tab", "success")
				}
			} else {
				// Fallback sample data for local dev server
				setMeta({
					...DEFAULT_META_DATA,
					title: "SideDevTools - Developer Companion Sidebar",
					description:
						"Offline-first Chrome sidebar extension featuring 10+ developer utilities, password vault, hashers, and builders.",
					canonicalUrl: "https://github.com/rasyidly/sidedevtools",
					faviconUrl:
						"https://github.githubassets.com/favicons/favicon.png",
					ogTitle: "SideDevTools - Developer Companion Sidebar",
					ogDescription:
						"Offline-first Chrome sidebar extension featuring 10+ developer utilities, password vault, hashers, and builders.",
					ogImage:
						"https://opengraph.githubassets.com/1/rasyidly/sidedevtools",
					ogUrl: "https://github.com/rasyidly/sidedevtools",
					ogSiteName: "GitHub",
					twitterCard: "summary_large_image",
					twitterTitle: "SideDevTools - Developer Companion Sidebar",
					twitterDescription:
						"Offline-first Chrome sidebar extension with zero network tracking.",
					twitterImage:
						"https://opengraph.githubassets.com/1/rasyidly/sidedevtools",
				})
				showToast("Loaded sample page data (Local Dev)", "info")
			}
		} catch (err: any) {
			console.error("Failed to fetch meta tags:", err)
			showToast(err.message || "Failed to inspect tab", "error")
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		fetchMetaFromTab()
	}, [])

	const handleCopyHtml = () => {
		const html = generateMetaHtml(meta)
		navigator.clipboard.writeText(html)
		setCopiedHtml(true)
		showToast("Meta tags copied to clipboard", "success")
		setTimeout(() => setCopiedHtml(false), 1500)
	}

	const updateMeta = (key: keyof MetaData, value: string) => {
		setMeta((prev) => ({...prev, [key]: value}))
	}

	// Helpers for Audit Checklist
	const titleLen = meta.title.length
	const isTitleOk = titleLen >= 30 && titleLen <= 60
	const descLen = meta.description.length
	const isDescOk = descLen >= 120 && descLen <= 160
	const hasOgImage = Boolean(meta.ogImage)
	const hasCanonical = Boolean(meta.canonicalUrl)

	const issuesCount =
		(!isTitleOk ? 1 : 0) +
		(!isDescOk ? 1 : 0) +
		(!hasOgImage ? 1 : 0) +
		(!hasCanonical ? 1 : 0)

	return (
		<div className="flex-1 flex flex-col gap-3 p-3">
			{/* Top Bar: Inspected Target & Fetch Action */}
			<div className="flex items-center justify-between p-2.5 rounded-lg border border-(--p-border) bg-(--p-surface)">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-7 h-7 rounded-lg bg-(--p-surface-subdued) border border-(--p-border-subtle) flex items-center justify-center text-(--p-text) shrink-0">
						{meta.faviconUrl ? (
							<img
								src={meta.faviconUrl}
								alt=""
								className="w-4 h-4 rounded object-contain"
								onError={(e) => {
									;(e.target as HTMLElement).style.display =
										"none"
								}}
							/>
						) : (
							<GlobeIcon size={15} />
						)}
					</div>
					<div className="min-w-0">
						<div className="text-xs font-semibold text-(--p-text) truncate">
							{meta.title || "No page inspected"}
						</div>
						<div className="text-[11px] text-(--p-text-subdued) truncate">
							{meta.canonicalUrl || "Active browser tab"}
						</div>
					</div>
				</div>

				<button
					onClick={fetchMetaFromTab}
					disabled={isLoading}
					className="h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors bg-(--p-surface-subdued) hover:bg-(--p-surface-hover) text-(--p-text) border border-(--p-border) flex items-center gap-1.5 shrink-0 disabled:opacity-50"
					title="Re-fetch from active browser tab"
				>
					<RefreshIcon
						size={13}
						className={isLoading ? "animate-spin" : ""}
					/>
					<span>{isLoading ? "Reading..." : "Fetch Tab"}</span>
				</button>
			</div>

			{/* Polaris Segmented Tabs (Matches Password Generator pattern) */}
			<div className="flex items-center gap-1 p-0.5 bg-(--p-surface-subdued) border border-(--p-border) rounded-lg overflow-x-auto">
				<button
					onClick={() => setActiveTab("preview")}
					className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeTab === "preview"
							? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
							: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
					}`}
				>
					<SparklesIcon size={15} />
					<span className="text-nowrap">Social Preview</span>
				</button>

				<button
					onClick={() => setActiveTab("builder")}
					className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeTab === "builder"
							? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
							: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
					}`}
				>
					<DocumentIcon size={15} />
					<span className="text-nowrap">Editor & Checks</span>
					{issuesCount > 0 && (
						<span
							className={`text-[9px] px-1.5 py-0.2 rounded-lg tabular-nums ${
								activeTab === "builder"
									? "bg-white/20 text-white font-semibold"
									: "bg-(--p-border) text-(--p-text)"
							}`}
						>
							{issuesCount}
						</span>
					)}
				</button>

				<button
					onClick={() => setActiveTab("code")}
					className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeTab === "code"
							? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
							: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
					}`}
				>
					<CodeIcon size={15} />
					<span className="text-nowrap">HTML Code</span>
				</button>
			</div>

			{/* TAB 1: SOCIAL PREVIEW (All-in-one screen: Google, Facebook & Twitter stacked) */}
			{activeTab === "preview" && (
				<div className="flex flex-col gap-3">
					{/* 1. Google SERP Preview Card */}
					<div className="p-3 rounded-lg border border-(--p-border) bg-(--p-surface) flex flex-col gap-2">
						<div className="flex items-center justify-between text-[11px]">
							<span className="text-(--p-text-subdued) font-medium">
								Google Search Result
							</span>
							<span className="text-[10px] text-(--p-text-subdued)">
								Desktop & Mobile SERP
							</span>
						</div>

						<div className="p-2.5 rounded-lg border border-(--p-border) bg-(--p-canvas) flex flex-col gap-1 select-text">
							<div className="flex items-center gap-1.5 text-[11px] text-(--p-text-subdued) truncate">
								{meta.faviconUrl && (
									<img
										src={meta.faviconUrl}
										alt=""
										className="w-3.5 h-3.5 rounded-full object-contain shrink-0"
										onError={(e) =>
											((
												e.target as HTMLElement
											).style.display = "none")
										}
									/>
								)}
								<span className="truncate">
									{meta.canonicalUrl || "https://example.com"}
								</span>
							</div>
							<div className="text-xs font-semibold text-[#008060] dark:text-[#34d399] leading-snug line-clamp-2">
								{meta.title || "Untitled Document"}
							</div>
							<div className="text-[11px] text-(--p-text-subdued) leading-relaxed line-clamp-2">
								{meta.description ||
									"No meta description specified for this webpage."}
							</div>
						</div>
					</div>

					{/* 2. Facebook / OpenGraph Card */}
					<div className="p-3 rounded-lg border border-(--p-border) bg-(--p-surface) flex flex-col gap-2">
						<div className="flex items-center justify-between text-[11px]">
							<span className="text-(--p-text-subdued) font-medium">
								Facebook / OpenGraph Card
							</span>
							<span className="text-[10px] text-(--p-text-subdued)">
								og:image (1200x630)
							</span>
						</div>

						<div className="rounded-lg border border-(--p-border) bg-(--p-canvas) overflow-hidden select-text">
							{meta.ogImage ? (
								<div className="w-full h-32 bg-(--p-surface-subdued) overflow-hidden flex items-center justify-center">
									<img
										src={meta.ogImage}
										alt="OG Preview"
										className="w-full h-full object-cover"
										onError={(e) => {
											;(
												e.target as HTMLElement
											).style.display = "none"
										}}
									/>
								</div>
							) : (
								<div className="w-full h-20 bg-(--p-surface-subdued) flex flex-col items-center justify-center text-(--p-text-subdued) text-xs gap-1">
									<AlertIcon size={16} />
									<span className="text-[10px]">
										No og:image specified
									</span>
								</div>
							)}

							<div className="p-2.5 flex flex-col gap-0.5 border-t border-(--p-border)">
								<div className="text-[9px] uppercase tracking-wider text-(--p-text-subdued) font-mono truncate">
									{meta.ogSiteName ||
										(meta.ogUrl
											? new URL(meta.ogUrl).hostname
											: "WEBSITE")}
								</div>
								<div className="text-xs font-semibold text-(--p-text) line-clamp-2 leading-snug">
									{meta.ogTitle ||
										meta.title ||
										"Untitled Document"}
								</div>
								<div className="text-[11px] text-(--p-text-subdued) line-clamp-2 leading-relaxed">
									{meta.ogDescription ||
										meta.description ||
										"No OpenGraph description specified."}
								</div>
							</div>
						</div>
					</div>

					{/* 3. Twitter / X Card Preview */}
					<div className="p-3 rounded-lg border border-(--p-border) bg-(--p-surface) flex flex-col gap-2">
						<div className="flex items-center justify-between text-[11px]">
							<span className="text-(--p-text-subdued) font-medium">
								Twitter / X Large Card
							</span>
							<span className="text-[10px] text-(--p-text-subdued)">
								{meta.twitterCard || "summary_large_image"}
							</span>
						</div>

						<div className="rounded-lg border border-(--p-border) bg-(--p-canvas) overflow-hidden select-text">
							{meta.twitterImage || meta.ogImage ? (
								<div className="w-full h-32 bg-(--p-surface-subdued) overflow-hidden flex items-center justify-center">
									<img
										src={meta.twitterImage || meta.ogImage}
										alt="Twitter Preview"
										className="w-full h-full object-cover"
										onError={(e) => {
											;(
												e.target as HTMLElement
											).style.display = "none"
										}}
									/>
								</div>
							) : (
								<div className="w-full h-20 bg-(--p-surface-subdued) flex flex-col items-center justify-center text-(--p-text-subdued) text-xs gap-1">
									<AlertIcon size={16} />
									<span className="text-[10px]">
										No twitter:image specified
									</span>
								</div>
							)}

							<div className="p-2.5 flex flex-col gap-0.5 border-t border-(--p-border)">
								<div className="text-[9px] text-(--p-text-subdued) truncate">
									{meta.ogUrl
										? new URL(meta.ogUrl).hostname
										: "x.com"}
								</div>
								<div className="text-xs font-semibold text-(--p-text) line-clamp-1 leading-snug">
									{meta.twitterTitle ||
										meta.ogTitle ||
										meta.title ||
										"Card Title"}
								</div>
								<div className="text-[11px] text-(--p-text-subdued) line-clamp-2 leading-relaxed">
									{meta.twitterDescription ||
										meta.ogDescription ||
										meta.description ||
										"Card description snippet."}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* TAB 2: EDITOR & CHECKS */}
			{activeTab === "builder" && (
				<div className="flex flex-col gap-3">
					{/* Audit Card adhering strictly to Polaris Status Badges & Metrics */}
					<div className="p-3 rounded-lg border border-(--p-border) bg-(--p-surface) flex flex-col gap-2">
						<div className="flex items-center justify-between text-[11px]">
							<span className="text-(--p-text) font-semibold">
								SEO & Social Audit
							</span>
							<Badge
								variant={
									issuesCount === 0 ? "success" : "attention"
								}
							>
								{issuesCount === 0
									? "All Passed"
									: `${issuesCount} Suggestions`}
							</Badge>
						</div>

						<div className="flex flex-col gap-1.5 pt-1 border-t border-(--p-border-subtle) text-[11px]">
							<div className="flex items-center justify-between">
								<span className="text-(--p-text-subdued)">
									Title Length:
								</span>
								<div className="flex items-center gap-1.5">
									<span className="tabular-nums font-mono text-[10px]">
										{titleLen}/60 chars
									</span>
									<Badge
										variant={
											isTitleOk ? "success" : "attention"
										}
									>
										{isTitleOk
											? "Optimal"
											: titleLen < 30
												? "Short"
												: "Long"}
									</Badge>
								</div>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-(--p-text-subdued)">
									Description:
								</span>
								<div className="flex items-center gap-1.5">
									<span className="tabular-nums font-mono text-[10px]">
										{descLen}/160 chars
									</span>
									<Badge
										variant={
											isDescOk ? "success" : "attention"
										}
									>
										{isDescOk
											? "Optimal"
											: descLen < 120
												? "Short"
												: "Long"}
									</Badge>
								</div>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-(--p-text-subdued)">
									OpenGraph Image:
								</span>
								<Badge
									variant={
										hasOgImage ? "success" : "attention"
									}
								>
									{hasOgImage ? "Present" : "Missing"}
								</Badge>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-(--p-text-subdued)">
									Canonical URL:
								</span>
								<Badge
									variant={
										hasCanonical ? "success" : "attention"
									}
								>
									{hasCanonical ? "Present" : "Missing"}
								</Badge>
							</div>
						</div>
					</div>

					{/* Form Editor Fields */}
					<div className="p-3 rounded-lg border border-(--p-border) bg-(--p-surface) flex flex-col gap-2.5">
						<div className="flex flex-col gap-1">
							<div className="flex justify-between items-center text-[11px]">
								<label className="text-(--p-text-subdued) font-medium">
									Page Title
								</label>
								<span className="text-[10px] text-(--p-text-subdued) tabular-nums">
									{titleLen}/60
								</span>
							</div>
							<Input
								value={meta.title}
								onChange={(e) =>
									updateMeta("title", e.target.value)
								}
								placeholder="e.g. Acme Studio - Fast Web Development"
								className="text-xs h-8"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<div className="flex justify-between items-center text-[11px]">
								<label className="text-(--p-text-subdued) font-medium">
									Meta Description
								</label>
								<span className="text-[10px] text-(--p-text-subdued) tabular-nums">
									{descLen}/160
								</span>
							</div>
							<Textarea
								value={meta.description}
								onChange={(e) =>
									updateMeta("description", e.target.value)
								}
								rows={5}
								placeholder="A brief summary for search engines and social cards..."
								className="text-xs resize-none"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] text-(--p-text-subdued) font-medium">
								Canonical URL
							</label>
							<Input
								value={meta.canonicalUrl}
								onChange={(e) =>
									updateMeta("canonicalUrl", e.target.value)
								}
								placeholder="https://example.com/page"
								className="text-xs h-8"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] text-(--p-text-subdued) font-medium">
								Social / OpenGraph Image URL
							</label>
							<Input
								value={meta.ogImage}
								onChange={(e) => {
									updateMeta("ogImage", e.target.value)
									if (!meta.twitterImage)
										updateMeta(
											"twitterImage",
											e.target.value,
										)
								}}
								placeholder="https://example.com/assets/og-image.jpg"
								className="text-xs h-8"
							/>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<div className="flex flex-col gap-1">
								<label className="text-[11px] text-(--p-text-subdued) font-medium">
									Site Name
								</label>
								<Input
									value={meta.ogSiteName}
									onChange={(e) =>
										updateMeta("ogSiteName", e.target.value)
									}
									placeholder="Acme"
									className="text-xs h-8"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<label className="text-[11px] text-(--p-text-subdued) font-medium">
									Twitter Handle
								</label>
								<Input
									value={meta.twitterSite}
									onChange={(e) =>
										updateMeta(
											"twitterSite",
											e.target.value,
										)
									}
									placeholder="@username"
									className="text-xs h-8"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<div className="flex flex-col gap-1">
								<label className="text-[11px] text-(--p-text-subdued) font-medium">
									Robots
								</label>
								<Input
									value={meta.robots}
									onChange={(e) =>
										updateMeta("robots", e.target.value)
									}
									placeholder="index, follow"
									className="text-xs h-8"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<label className="text-[11px] text-(--p-text-subdued) font-medium">
									Theme Color
								</label>
								<div className="flex items-center gap-1.5">
									<input
										type="color"
										value={meta.themeColor || "#000000"}
										onChange={(e) =>
											updateMeta(
												"themeColor",
												e.target.value,
											)
										}
										className="w-8 h-8 rounded-lg border border-(--p-border) cursor-pointer p-0 bg-transparent shrink-0"
									/>
									<Input
										value={meta.themeColor}
										onChange={(e) =>
											updateMeta(
												"themeColor",
												e.target.value,
											)
										}
										placeholder="#000000"
										className="text-xs h-8"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* TAB 3: GENERATED HTML CODE */}
			{activeTab === "code" && (
				<div className="flex flex-col gap-3">
					<div className="p-3 rounded-lg border border-(--p-border) bg-(--p-surface) flex flex-col gap-2">
						<div className="flex items-center justify-between text-[11px]">
							<span className="text-(--p-text-subdued) font-medium">
								Ready to paste into &lt;head&gt;
							</span>
							<Button
								size="xs"
								variant="default"
								onClick={handleCopyHtml}
								className="gap-1"
							>
								{copiedHtml ? (
									<CheckIcon size={12} />
								) : (
									<CopyIcon size={12} />
								)}
								<span>
									{copiedHtml ? "Copied" : "Copy All Tags"}
								</span>
							</Button>
						</div>

						<div className="p-2.5 rounded-lg bg-(--p-canvas) border border-(--p-border) font-mono text-[11px] text-(--p-text) overflow-x-auto select-all break-all  overflow-y-auto leading-relaxed whitespace-pre">
							{generateMetaHtml(meta)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
