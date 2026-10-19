import {useState, useEffect, useMemo} from "react"
import {
	RefreshIcon,
	TrashIcon,
	CopyIcon,
	CheckIcon,
	SearchIcon,
	PlusIcon,
	CloseIcon,
	CodeIcon,
	DownloadIcon,
	AlertIcon,
	GlobeIcon,
	DatabaseIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {Input, Textarea} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {Modal} from "@/components/ui/modal"
import {useToast} from "@/components/ui/toast"
import {
	type StorageItem,
	type CookieItem,
	formatBytes,
	getActiveTabStorageScript,
	updateActiveTabStorageScript,
} from "./utils"

type StorageCategory = "local" | "session" | "cookies"

export function TabStorageManagerView() {
	const [activeCategory, setActiveCategory] =
		useState<StorageCategory>("local")
	const [localStorageItems, setLocalStorageItems] = useState<StorageItem[]>(
		[],
	)
	const [sessionStorageItems, setSessionStorageItems] = useState<
		StorageItem[]
	>([])
	const [cookies, setCookies] = useState<CookieItem[]>([])
	const [pageUrl, setPageUrl] = useState("")
	const [pageOrigin, setPageOrigin] = useState("")
	const [tabId, setTabId] = useState<number | null>(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingItem, setEditingItem] = useState<{
		key: string
		value: string
		isNew?: boolean
	}>({key: "", value: "", isNew: true})
	const [copiedKey, setCopiedKey] = useState<string | null>(null)
	const {showToast} = useToast()

	const fetchTabStorage = async () => {
		setIsLoading(true)
		try {
			if (
				typeof chrome !== "undefined" &&
				chrome.tabs &&
				chrome.scripting
			) {
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

				setTabId(tab.id)
				const currentUrl = tab.url || ""
				setPageUrl(currentUrl)

				if (
					currentUrl.startsWith("chrome://") ||
					currentUrl.startsWith("edge://") ||
					currentUrl.startsWith("chrome-extension://")
				) {
					showToast(
						"Cannot access browser internal pages. Navigate to any website.",
						"info",
					)
					setIsLoading(false)
					return
				}

				try {
					const parsedUrl = new URL(currentUrl)
					setPageOrigin(parsedUrl.origin)
				} catch {}

				const [res] = await chrome.scripting.executeScript({
					target: {tabId: tab.id},
					func: getActiveTabStorageScript,
				})

				if (res && res.result) {
					setLocalStorageItems(res.result.localStorageItems || [])
					setSessionStorageItems(res.result.sessionStorageItems || [])
				}

				const [cookieRes] = await chrome.scripting.executeScript({
					target: {tabId: tab.id},
					func: () => document.cookie,
				})

				if (cookieRes && typeof cookieRes.result === "string") {
					const rawCookie = cookieRes.result
					if (rawCookie) {
						const parsedCookies: CookieItem[] = rawCookie
							.split(";")
							.map((c) => c.trim())
							.filter(Boolean)
							.map((part) => {
								const eqIdx = part.indexOf("=")
								const name =
									eqIdx > 0
										? part.substring(0, eqIdx).trim()
										: part
								const value =
									eqIdx > 0
										? part.substring(eqIdx + 1).trim()
										: ""
								return {
									name,
									value,
									domain: window.location.hostname,
									path: "/",
									secure:
										window.location.protocol === "https:",
									httpOnly: false,
									sameSite: "Lax",
								}
							})
						setCookies(parsedCookies)
					} else {
						setCookies([])
					}
				}

				showToast("Storage items refreshed", "success")
			} else {
				setPageUrl("https://example.com/app/dashboard")
				setPageOrigin("https://example.com")
				setLocalStorageItems([
					{
						key: "auth_token",
						value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID198",
						sizeBytes: 112,
					},
					{
						key: "app_theme",
						value: "dark",
						sizeBytes: 18,
					},
					{
						key: "user_preferences",
						value: JSON.stringify(
							{sidebarOpen: true, notifications: true},
							null,
							2,
						),
						sizeBytes: 86,
					},
				])
				setSessionStorageItems([
					{
						key: "active_session_id",
						value: "sess_98234ab129",
						sizeBytes: 38,
					},
				])
				setCookies([
					{
						name: "_ga",
						value: "GA1.2.192847291.1712984",
						domain: ".example.com",
						path: "/",
						secure: true,
						httpOnly: false,
						sameSite: "Lax",
					},
				])
			}
		} catch (err: any) {
			showToast(err.message || "Failed to inspect active tab", "error")
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		fetchTabStorage()
	}, [])

	const activeItems = useMemo(() => {
		const q = searchQuery.toLowerCase().trim()
		if (activeCategory === "local") {
			return localStorageItems.filter(
				(item) =>
					!q ||
					item.key.toLowerCase().includes(q) ||
					item.value.toLowerCase().includes(q),
			)
		}
		if (activeCategory === "session") {
			return sessionStorageItems.filter(
				(item) =>
					!q ||
					item.key.toLowerCase().includes(q) ||
					item.value.toLowerCase().includes(q),
			)
		}
		return []
	}, [activeCategory, localStorageItems, sessionStorageItems, searchQuery])

	const filteredCookies = useMemo(() => {
		const q = searchQuery.toLowerCase().trim()
		return cookies.filter(
			(c) =>
				!q ||
				c.name.toLowerCase().includes(q) ||
				c.value.toLowerCase().includes(q),
		)
	}, [cookies, searchQuery])

	const totalLocalBytes = useMemo(
		() => localStorageItems.reduce((acc, i) => acc + i.sizeBytes, 0),
		[localStorageItems],
	)
	const totalSessionBytes = useMemo(
		() => sessionStorageItems.reduce((acc, i) => acc + i.sizeBytes, 0),
		[sessionStorageItems],
	)

	const handleSaveItem = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!editingItem.key.trim()) return

		if (
			typeof chrome !== "undefined" &&
			chrome.scripting &&
			tabId &&
			activeCategory !== "cookies"
		) {
			try {
				await chrome.scripting.executeScript({
					target: {tabId},
					func: updateActiveTabStorageScript,
					args: [
						activeCategory === "local" ? "local" : "session",
						"set",
						editingItem.key,
						editingItem.value,
					],
				})
				showToast("Saved storage key", "success")
			} catch (err) {
				showToast("Failed to write to active tab storage", "error")
			}
		}

		if (activeCategory === "local") {
			setLocalStorageItems((prev) => {
				const filtered = prev.filter((i) => i.key !== editingItem.key)
				return [
					{
						key: editingItem.key,
						value: editingItem.value,
						sizeBytes:
							(editingItem.key.length +
								editingItem.value.length) *
							2,
					},
					...filtered,
				]
			})
		} else if (activeCategory === "session") {
			setSessionStorageItems((prev) => {
				const filtered = prev.filter((i) => i.key !== editingItem.key)
				return [
					{
						key: editingItem.key,
						value: editingItem.value,
						sizeBytes:
							(editingItem.key.length +
								editingItem.value.length) *
							2,
					},
					...filtered,
				]
			})
		}

		setIsModalOpen(false)
	}

	const handleRemoveItem = async (key: string) => {
		if (
			typeof chrome !== "undefined" &&
			chrome.scripting &&
			tabId &&
			activeCategory !== "cookies"
		) {
			try {
				await chrome.scripting.executeScript({
					target: {tabId},
					func: updateActiveTabStorageScript,
					args: [
						activeCategory === "local" ? "local" : "session",
						"remove",
						key,
					],
				})
			} catch {}
		}

		if (activeCategory === "local") {
			setLocalStorageItems((prev) => prev.filter((i) => i.key !== key))
		} else if (activeCategory === "session") {
			setSessionStorageItems((prev) => prev.filter((i) => i.key !== key))
		}
		showToast("Removed key", "success")
	}

	const handleClearCurrentStore = async () => {
		if (
			!confirm(
				"Are you sure you want to clear all " +
					activeCategory +
					" storage for this tab?",
			)
		) {
			return
		}

		if (
			typeof chrome !== "undefined" &&
			chrome.scripting &&
			tabId &&
			activeCategory !== "cookies"
		) {
			try {
				await chrome.scripting.executeScript({
					target: {tabId},
					func: updateActiveTabStorageScript,
					args: [
						activeCategory === "local" ? "local" : "session",
						"clear",
					],
				})
			} catch {}
		}

		if (activeCategory === "local") setLocalStorageItems([])
		if (activeCategory === "session") setSessionStorageItems([])
		showToast("Cleared storage", "success")
	}

	const handleCopyValue = async (key: string, val: string) => {
		try {
			await navigator.clipboard.writeText(val)
			setCopiedKey(key)
			showToast("Copied to clipboard", "success")
			setTimeout(() => setCopiedKey(null), 1800)
		} catch {
			showToast("Failed to copy", "error")
		}
	}

	const handleExportJson = () => {
		const payload = {
			pageUrl,
			pageOrigin,
			timestamp: new Date().toISOString(),
			localStorage: Object.fromEntries(
				localStorageItems.map((i) => [i.key, i.value]),
			),
			sessionStorage: Object.fromEntries(
				sessionStorageItems.map((i) => [i.key, i.value]),
			),
			cookies: cookies.map((c) => ({name: c.name, value: c.value})),
		}

		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: "application/json",
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.href = url
		a.download =
			"storage-" +
			(pageOrigin.replace(/https?:\/\//, "").replace(/[^\w-]/g, "_") ||
				"tab") +
			".json"
		a.click()
		URL.revokeObjectURL(url)
		showToast("Exported storage backup to JSON", "success")
	}

	const openAddModal = () => {
		setEditingItem({key: "", value: "", isNew: true})
		setIsModalOpen(true)
	}

	const openEditModal = (key: string, value: string) => {
		setEditingItem({key, value, isNew: false})
		setIsModalOpen(true)
	}

	return (
		<div className="flex-1 flex flex-col gap-3 p-3">
			{/* Top Bar: Target Tab Banner & Re-fetch Action */}
			<div className="flex items-center justify-between p-2.5 rounded-lg border border-(--p-border) bg-(--p-surface)">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-7 h-7 rounded-lg bg-(--p-surface-subdued) border border-(--p-border-subtle) flex items-center justify-center text-(--p-text) shrink-0">
						<GlobeIcon size={15} />
					</div>
					<div className="min-w-0">
						<div className="text-xs font-semibold text-(--p-text) truncate">
							{pageOrigin || "Active Web Tab"}
						</div>
						<div className="text-[11px] text-(--p-text-subdued) truncate font-mono">
							{pageUrl || "Inspecting browser session"}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					<button
						onClick={handleExportJson}
						className="h-7 px-2 rounded-lg text-xs font-medium cursor-pointer transition-colors bg-(--p-surface-subdued) hover:bg-(--p-surface-hover) text-(--p-text) border border-(--p-border) flex items-center gap-1.5"
						title="Export storage snapshot as JSON"
					>
						<DownloadIcon size={13} />
						<span className="hidden sm:inline">Export</span>
					</button>

					<button
						onClick={fetchTabStorage}
						disabled={isLoading}
						className="h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors bg-(--p-surface-subdued) hover:bg-(--p-surface-hover) text-(--p-text) border border-(--p-border) flex items-center gap-1.5 disabled:opacity-50"
						title="Re-fetch from active browser tab"
					>
						<RefreshIcon
							size={13}
							className={isLoading ? "animate-spin" : ""}
						/>
						<span>{isLoading ? "Reading..." : "Fetch Tab"}</span>
					</button>
				</div>
			</div>

			{/* Polaris Segmented Tabs */}
			<div className="flex items-center gap-1 p-0.5 bg-(--p-surface-subdued) border border-(--p-border) rounded-lg">
				<button
					onClick={() => setActiveCategory("local")}
					className={
						"flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 " +
						(activeCategory === "local"
							? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
							: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)")
					}
				>
					<span>localStorage</span>
					<span
						className={
							"text-[9px] px-1.5 py-0.2 rounded-lg tabular-nums " +
							(activeCategory === "local"
								? "bg-white/20 text-white font-semibold"
								: "bg-(--p-border) text-(--p-text)")
						}
					>
						{localStorageItems.length}
					</span>
				</button>

				<button
					onClick={() => setActiveCategory("session")}
					className={
						"flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 " +
						(activeCategory === "session"
							? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
							: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)")
					}
				>
					<span>sessionStorage</span>
					<span
						className={
							"text-[9px] px-1.5 py-0.2 rounded-lg tabular-nums " +
							(activeCategory === "session"
								? "bg-white/20 text-white font-semibold"
								: "bg-(--p-border) text-(--p-text)")
						}
					>
						{sessionStorageItems.length}
					</span>
				</button>

				<button
					onClick={() => setActiveCategory("cookies")}
					className={
						"flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 " +
						(activeCategory === "cookies"
							? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
							: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)")
					}
				>
					<span>Cookies</span>
					<span
						className={
							"text-[9px] px-1.5 py-0.2 rounded-lg tabular-nums " +
							(activeCategory === "cookies"
								? "bg-white/20 text-white font-semibold"
								: "bg-(--p-border) text-(--p-text)")
						}
					>
						{cookies.length}
					</span>
				</button>
			</div>

			{/* Search & Actions Bar */}
			<div className="flex items-center justify-between gap-2 text-xs">
				<div className="relative flex-1">
					<SearchIcon
						size={14}
						className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--p-text-subdued) pointer-events-none"
					/>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={"Search " + activeCategory + "..."}
						className="w-full pl-8 pr-6 py-1 bg-(--p-surface) border border-(--p-border) rounded-lg text-[11px] text-(--p-text) placeholder:text-(--p-text-subdued) focus:outline-none focus:border-[#008060]! transition-colors"
					/>
					{searchQuery && (
						<button
							onClick={() => setSearchQuery("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer"
						>
							<CloseIcon size={12} />
						</button>
					)}
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					<span className="text-[10px] tabular-nums text-(--p-text-subdued) mr-0.5">
						{activeCategory === "local" &&
							formatBytes(totalLocalBytes)}
						{activeCategory === "session" &&
							formatBytes(totalSessionBytes)}
					</span>

					{activeCategory !== "cookies" && (
						<Button
							variant="default"
							size="xs"
							onClick={openAddModal}
							className="h-6 text-[10px] px-2"
						>
							<PlusIcon size={12} />
							<span>Add Key</span>
						</Button>
					)}

					{activeCategory !== "cookies" && activeItems.length > 0 && (
						<button
							onClick={handleClearCurrentStore}
							title={"Clear all " + activeCategory + " storage"}
							className="p-1 text-(--p-text-subdued) hover:text-[#f87171] transition-colors cursor-pointer"
						>
							<TrashIcon size={15} />
						</button>
					)}
				</div>
			</div>

			{/* List Items: LocalStorage & SessionStorage */}
			{activeCategory !== "cookies" && (
				<div className="flex-1 flex flex-col">
					{activeItems.length === 0 ? (
						<div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-(--p-border) bg-(--p-surface)/50 animate-card-entrance my-auto">
							<DatabaseIcon
								size={26}
								className="text-(--p-text-subdued) mb-2"
							/>
							<p className="text-xs font-semibold text-(--p-text)">
								{searchQuery
									? "No matches found"
									: "No " + activeCategory + " items"}
							</p>
							<p className="text-[11px] text-(--p-text-subdued) mt-0.5 max-w-xs">
								{searchQuery
									? "Try searching with another key or value"
									: "The active tab has not stored any " +
										activeCategory +
										" data yet."}
							</p>
							{!searchQuery && (
								<Button
									variant="default"
									size="xs"
									onClick={openAddModal}
									className="mt-3"
								>
									<PlusIcon size={14} className="mr-1" />
									<span>Add First Key</span>
								</Button>
							)}
						</div>
					) : (
						<div className="flex flex-col rounded-lg border border-(--p-border) bg-(--p-surface) divide-y divide-(--p-border-subtle) overflow-hidden shadow-xs">
							{activeItems.map((item) => {
								const isCopied = copiedKey === item.key
								return (
									<div
										key={item.key}
										className="group flex flex-col gap-1 p-2.5 hover:bg-(--p-surface-hover) transition-colors"
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-1.5 overflow-hidden">
												<span className="font-mono text-[11px] font-semibold text-[#008060] dark:text-[#34d399] truncate select-text">
													{item.key}
												</span>
												<span className="text-[9px] tabular-nums text-(--p-text-subdued) bg-(--p-surface-subdued) px-1 py-0.2 rounded-lg border border-(--p-border-subtle)">
													{formatBytes(
														item.sizeBytes,
													)}
												</span>
											</div>

											<div className="flex items-center gap-1 shrink-0">
												<button
													onClick={() =>
														handleCopyValue(
															item.key,
															item.value,
														)
													}
													className="p-1 rounded text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer transition-colors"
													title="Copy value"
												>
													{isCopied ? (
														<CheckIcon
															size={14}
															className="text-[#008060]"
														/>
													) : (
														<CopyIcon size={14} />
													)}
												</button>
												<button
													onClick={() =>
														openEditModal(
															item.key,
															item.value,
														)
													}
													className="p-1 rounded text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer transition-colors"
													title="Edit item"
												>
													<CodeIcon size={14} />
												</button>
												<button
													onClick={() =>
														handleRemoveItem(
															item.key,
														)
													}
													className="p-1 rounded text-(--p-text-subdued) hover:text-[#f87171] cursor-pointer transition-colors"
													title="Delete item"
												>
													<TrashIcon size={14} />
												</button>
											</div>
										</div>

										<div className="font-mono text-[11px] text-(--p-text) bg-(--p-canvas) rounded-lg p-2 break-all max-h-[80px] overflow-y-auto select-text leading-tight border border-(--p-border-subtle)">
											{item.value}
										</div>
									</div>
								)
							})}
						</div>
					)}
				</div>
			)}

			{/* List Items: Cookies */}
			{activeCategory === "cookies" && (
				<div className="flex-1 flex flex-col">
					{filteredCookies.length === 0 ? (
						<div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-(--p-border) bg-(--p-surface)/50 animate-card-entrance my-auto">
							<AlertIcon
								size={26}
								className="text-(--p-text-subdued) mb-2"
							/>
							<p className="text-xs font-semibold text-(--p-text)">
								No accessible cookies
							</p>
							<p className="text-[11px] text-(--p-text-subdued) mt-0.5 max-w-xs">
								Document cookies are empty or protected with
								HttpOnly flags.
							</p>
						</div>
					) : (
						<div className="flex flex-col rounded-lg border border-(--p-border) bg-(--p-surface) divide-y divide-(--p-border-subtle) overflow-hidden shadow-xs">
							{filteredCookies.map((cookie) => (
								<div
									key={cookie.name}
									className="flex flex-col gap-1 p-2.5 hover:bg-(--p-surface-hover) transition-colors"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-1.5">
											<span className="font-mono text-[11px] font-semibold text-[#2563eb] dark:text-[#60a5fa] truncate select-text">
												{cookie.name}
											</span>
											{cookie.secure && (
												<span className="text-[9px] text-[#008060] bg-[#008060]/10 px-1 rounded-lg border border-[#008060]/20">
													Secure
												</span>
											)}
										</div>
										<button
											onClick={() =>
												handleCopyValue(
													cookie.name,
													cookie.value,
												)
											}
											className="p-1 rounded text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer transition-colors"
											title="Copy cookie value"
										>
											{copiedKey === cookie.name ? (
												<CheckIcon
													size={14}
													className="text-[#008060]"
												/>
											) : (
												<CopyIcon size={14} />
											)}
										</button>
									</div>
									<div className="font-mono text-[11px] text-(--p-text) bg-(--p-canvas) rounded-lg p-2 break-all max-h-[80px] overflow-y-auto select-text leading-tight border border-(--p-border-subtle)">
										{cookie.value}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Edit/Add Key Modal */}
			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={
					editingItem.isNew
						? "Add to " +
							(activeCategory === "local"
								? "localStorage"
								: "sessionStorage")
						: 'Edit "' + editingItem.key + '"'
				}
				icon={<DatabaseIcon size={18} className="text-[#008060]" />}
			>
				<form onSubmit={handleSaveItem} className="flex flex-col gap-3">
					<div className="flex flex-col gap-2 text-xs">
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-medium text-(--p-text)">
								Storage Key{" "}
								<span className="text-[#f87171]">*</span>
							</label>
							<Input
								required
								autoFocus={editingItem.isNew}
								value={editingItem.key}
								disabled={!editingItem.isNew}
								onChange={(e) =>
									setEditingItem({
										...editingItem,
										key: e.target.value,
									})
								}
								placeholder="e.g. auth_token, user_session"
								className="font-mono text-xs"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-medium text-(--p-text)">
								Storage Value
							</label>
							<Textarea
								value={editingItem.value}
								onChange={(e) =>
									setEditingItem({
										...editingItem,
										value: e.target.value,
									})
								}
								placeholder="Value (string, JSON object, ID)..."
								rows={4}
								className="font-mono text-xs"
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setIsModalOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" variant="default" size="sm">
							Save to Tab
						</Button>
					</div>
				</form>
			</Modal>
		</div>
	)
}
