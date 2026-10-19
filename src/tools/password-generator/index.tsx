import React, {useState, useEffect, useCallback, useMemo} from "react"
import {
	RefreshIcon,
	CopyIcon,
	BookmarkIcon,
	EyeIcon,
	EyeOffIcon,
	TrashIcon,
	PlusIcon,
	DownloadIcon,
	UploadIcon,
	SearchIcon,
	SparklesIcon,
	LockIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {Modal} from "@/components/ui/modal"
import {Input, Textarea} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {Switch} from "@/components/ui/switch"
import {useToast} from "@/components/ui/toast"
import {generatePassword, calculateStrength} from "./utils"
import type {PasswordOptions, SavedPassword} from "./utils"

// Vibrant Polaris-aligned strength meter colors
const STRENGTH_COLORS: Record<number, string> = {
	1: "#ef4444", // Red (Very Weak)
	2: "#f97316", // Orange (Weak)
	3: "#eab308", // Amber/Yellow (Fair)
	4: "#10b981", // Emerald (Strong)
	5: "#008060", // Polaris Forest Green (Very Strong)
}

export function PasswordGeneratorView() {
	const [activeTab, setActiveTab] = useState<"generator" | "vault">(
		"generator",
	)
	const [options, setOptions] = useState<PasswordOptions>({
		length: 18,
		uppercase: true,
		lowercase: true,
		numbers: true,
		symbols: true,
		excludeAmbiguous: false,
		excludeSimilar: true,
	})

	const [currentPassword, setCurrentPassword] = useState("")
	const [showPassword, setShowPassword] = useState(true)
	const [isGeneratedAnim, setIsGeneratedAnim] = useState(false)

	// Save Modal / State
	const [isSaving, setIsSaving] = useState(false)
	const [saveLabel, setSaveLabel] = useState("")
	const [saveNotes, setSaveNotes] = useState("")

	// Vault state
	const [savedVault, setSavedVault] = useState<SavedPassword[]>(() => {
		try {
			const stored = localStorage.getItem("SideDevTools_password_vault")
			return stored ? JSON.parse(stored) : []
		} catch {
			return []
		}
	})
	const [vaultSearch, setVaultSearch] = useState("")
	const [revealedVaultIds, setRevealedVaultIds] = useState<
		Record<string, boolean>
	>({})

	const {showToast} = useToast()

	// Sync vault to localStorage
	useEffect(() => {
		try {
			localStorage.setItem(
				"SideDevTools_password_vault",
				JSON.stringify(savedVault),
			)
		} catch {}
	}, [savedVault])

	const handleGenerate = useCallback(() => {
		const pwd = generatePassword(options)
		setCurrentPassword(pwd)

		// Trigger subtle generation feedback animation
		setIsGeneratedAnim(true)
		setTimeout(() => setIsGeneratedAnim(false), 400)
	}, [options])

	useEffect(() => {
		handleGenerate()
	}, [handleGenerate])

	const strength = useMemo(
		() => calculateStrength(currentPassword),
		[currentPassword],
	)

	const handleCopy = (text: string) => {
		if (!text) return
		navigator.clipboard.writeText(text)
		showToast("Copied to clipboard", "success")
	}

	const handleSaveCurrent = () => {
		if (!currentPassword) return
		setIsSaving(true)
		setSaveLabel("")
		setSaveNotes("")
	}

	const handleConfirmSave = (e: React.FormEvent) => {
		e.preventDefault()
		if (!saveLabel.trim()) return

		const newEntry: SavedPassword = {
			id: Math.random().toString(36).substring(2, 9),
			label: saveLabel.trim(),
			password: currentPassword,
			notes: saveNotes.trim() || undefined,
			createdAt: Date.now(),
			strength: strength.label === "Very Weak" ? "Weak" : strength.label,
		}

		setSavedVault((prev) => [newEntry, ...prev])
		setIsSaving(false)
		showToast("Password saved to Vault", "success")
	}

	const handleDeleteSaved = (id: string) => {
		setSavedVault((prev) => prev.filter((item) => item.id !== id))
		showToast("Password removed from Vault", "info")
	}

	const toggleRevealVault = (id: string) => {
		setRevealedVaultIds((prev) => ({...prev, [id]: !prev[id]}))
	}

	const handleExportVault = () => {
		if (savedVault.length === 0) {
			showToast("Vault is empty", "error")
			return
		}
		const dataStr =
			"data:text/json;charset=utf-8," +
			encodeURIComponent(JSON.stringify(savedVault, null, 2))
		const downloadAnchor = document.createElement("a")
		downloadAnchor.setAttribute("href", dataStr)
		downloadAnchor.setAttribute(
			"download",
			`SideDevTools_vault_${Date.now()}.json`,
		)
		document.body.appendChild(downloadAnchor)
		downloadAnchor.click()
		downloadAnchor.remove()
		showToast("Vault exported as JSON", "info")
	}

	const handleImportVault = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = (event) => {
			try {
				const parsed = JSON.parse(event.target?.result as string)
				if (Array.isArray(parsed)) {
					setSavedVault((prev) => [...parsed, ...prev])
					showToast(
						`Imported ${parsed.length} credentials`,
						"success",
					)
				}
			} catch {
				showToast("Invalid JSON file format", "error")
			}
		}
		reader.readAsText(file)
	}

	const filteredVault = useMemo(() => {
		const q = vaultSearch.toLowerCase().trim()
		if (!q) return savedVault
		return savedVault.filter(
			(item) =>
				item.label.toLowerCase().includes(q) ||
				(item.notes && item.notes.toLowerCase().includes(q)),
		)
	}, [savedVault, vaultSearch])

	return (
		<div className="flex-1 flex flex-col gap-3 p-3">
			{/* Polaris Tabs Header */}
			<div className="flex items-center gap-1 p-0.5 bg-(--p-surface-subdued) border border-(--p-border) rounded-lg">
				<button
					onClick={() => setActiveTab("generator")}
					className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeTab === "generator"
							? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
							: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
					}`}
				>
					<SparklesIcon size={16} />
					<span>Generator</span>
				</button>
				<button
					onClick={() => setActiveTab("vault")}
					className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeTab === "vault"
							? "bg-[#008060] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-semibold"
							: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
					}`}
				>
					<LockIcon size={16} />
					<span>Vault</span>
					{savedVault.length > 0 && (
						<span
							className={`text-[9px] px-1.5 py-0.2 rounded-lg tabular-nums ${
								activeTab === "vault"
									? "bg-white/20 text-white font-semibold"
									: "bg-(--p-border) text-(--p-text)"
							}`}
						>
							{savedVault.length}
						</span>
					)}
				</button>
			</div>

			{activeTab === "generator" ? (
				/* Generator Tab Content */
				<div className="flex flex-col gap-3">
					{/* Main Password Display Box */}
					<div className="flex flex-col gap-2 p-3 rounded-lg border border-(--p-border) bg-(--p-surface) shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-semibold text-(--p-text-subdued) uppercase tracking-wider">
								Generated Password
							</span>
							<button
								onClick={() => setShowPassword(!showPassword)}
								className="text-(--p-text-subdued) hover:text-(--p-text) p-0.5 cursor-pointer flex items-center gap-1 text-[11px]"
								title={
									showPassword
										? "Mask password"
										: "Show password"
								}
							>
								{showPassword ? (
									<EyeOffIcon size={15} />
								) : (
									<EyeIcon size={15} />
								)}
								<span>{showPassword ? "Hide" : "Show"}</span>
							</button>
						</div>

						{/* Password text with animated generation flash effect */}
						<div
							className={`flex items-center justify-between p-2 rounded-lg bg-(--p-canvas) border border-(--p-border) font-mono text-xs select-all break-all overflow-hidden min-h-[36px] transition-all duration-200 ${
								isGeneratedAnim
									? "animate-text-generated border-[#008060]"
									: ""
							}`}
						>
							<span className="text-[#008060] dark:text-[#34d399] tracking-wider font-semibold">
								{showPassword
									? currentPassword
									: "•".repeat(currentPassword.length || 16)}
							</span>
						</div>

						{/* Real-time Strength Meter Bar */}
						<div className="flex flex-col gap-1.5 pt-1">
							<div className="flex items-center justify-between text-[11px]">
								<div className="flex items-center gap-1.5">
									<span className="text-(--p-text-subdued)">
										Strength:
									</span>
									<span
										className="font-semibold transition-colors duration-200"
										style={{
											color:
												STRENGTH_COLORS[
													strength.score
												] || "#008060",
										}}
									>
										{strength.label}
									</span>
								</div>
								<div className="flex items-center gap-1 text-[10px] text-(--p-text-subdued) tabular-nums">
									<span>{strength.entropy} bits</span>
									<span>·</span>
									<span>{strength.crackTime}</span>
								</div>
							</div>

							{/* Segmented Strength Bar */}
							<div className="grid grid-cols-5 gap-1.5 h-2 w-full bg-(--p-surface-subdued) rounded-lg p-0.5 overflow-hidden">
								{[1, 2, 3, 4, 5].map((lvl) => {
									const isActive = strength.score >= lvl
									const barColor =
										STRENGTH_COLORS[strength.score] ||
										"#008060"
									return (
										<div
											key={lvl}
											className="h-full rounded-sm transition-all duration-300"
											style={{
												backgroundColor: isActive
													? barColor
													: "transparent",
												opacity: isActive ? 1 : 0.15,
											}}
										/>
									)
								})}
							</div>
						</div>

						{/* Quick Actions Bar */}
						<div className="flex items-center gap-1.5 pt-1">
							<Button
								variant="default"
								size="sm"
								onClick={() => handleCopy(currentPassword)}
								className="flex-1"
							>
								<CopyIcon size={15} />
								<span>Copy Password</span>
							</Button>

							<button
								onClick={handleGenerate}
								title="Regenerate password"
								className="p-1.5 rounded-lg text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] hover:bg-(--p-surface-hover) transition-colors cursor-pointer"
							>
								<RefreshIcon
									size={18}
									className={
										isGeneratedAnim ? "animate-spin" : ""
									}
								/>
							</button>

							<button
								onClick={handleSaveCurrent}
								title="Save to local Vault"
								className="px-2 py-1.5 rounded-lg text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] hover:bg-(--p-surface-hover) transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
							>
								<BookmarkIcon size={16} />
								<span>Save</span>
							</button>
						</div>
					</div>

					{/* Configuration Options Card */}
					<div className="flex flex-col gap-2.5 p-3 rounded-lg border border-(--p-border) bg-(--p-surface)">
						{/* Length Slider & Quick Presets */}
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between text-[11px]">
								<span className="text-(--p-text) font-medium">
									Length
								</span>
								<span className="text-xs text-[#008060] dark:text-[#34d399] font-semibold tabular-nums">
									{options.length} chars
								</span>
							</div>
							<input
								type="range"
								min={8}
								max={64}
								value={options.length}
								onChange={(e) =>
									setOptions((o) => ({
										...o,
										length: Number(e.target.value),
									}))
								}
								className="w-full accent-[#008060] cursor-pointer h-1.5 bg-(--p-surface-hover) rounded-lg"
							/>
							<div className="flex items-center justify-between gap-1 pt-0.5">
								{[12, 16, 20, 24, 32].map((len) => (
									<button
										key={len}
										onClick={() =>
											setOptions((o) => ({
												...o,
												length: len,
											}))
										}
										className={`flex-1 py-1 text-[10px] rounded-lg cursor-pointer transition-colors tabular-nums ${
											options.length === len
												? "bg-[#008060] text-white font-semibold"
												: "bg-(--p-surface-subdued) text-(--p-text-subdued) hover:text-(--p-text)"
										}`}
									>
										{len}
									</button>
								))}
							</div>
						</div>

						{/* Character Set Switches */}
						<div className="grid grid-cols-2 gap-2 pt-2 border-t border-(--p-border-subtle) text-[11px]">
							<label className="flex items-center justify-between gap-1.5 p-1 rounded-lg text-(--p-text) hover:bg-(--p-surface-hover) cursor-pointer select-none transition-colors">
								<span className="font-medium text-[11px]">
									Uppercase (A-Z)
								</span>
								<Switch
									size="sm"
									checked={options.uppercase}
									onCheckedChange={(checked) =>
										setOptions((o) => ({
											...o,
											uppercase: checked,
										}))
									}
								/>
							</label>

							<label className="flex items-center justify-between gap-1.5 p-1 rounded-lg text-(--p-text) hover:bg-(--p-surface-hover) cursor-pointer select-none transition-colors">
								<span className="font-medium text-[11px]">
									Lowercase (a-z)
								</span>
								<Switch
									size="sm"
									checked={options.lowercase}
									onCheckedChange={(checked) =>
										setOptions((o) => ({
											...o,
											lowercase: checked,
										}))
									}
								/>
							</label>

							<label className="flex items-center justify-between gap-1.5 p-1 rounded-lg text-(--p-text) hover:bg-(--p-surface-hover) cursor-pointer select-none transition-colors">
								<span className="font-medium text-[11px]">
									Numbers (0-9)
								</span>
								<Switch
									size="sm"
									checked={options.numbers}
									onCheckedChange={(checked) =>
										setOptions((o) => ({
											...o,
											numbers: checked,
										}))
									}
								/>
							</label>

							<label className="flex items-center justify-between gap-1.5 p-1 rounded-lg text-(--p-text) hover:bg-(--p-surface-hover) cursor-pointer select-none transition-colors">
								<span className="font-medium text-[11px]">
									Symbols (!@#$...)
								</span>
								<Switch
									size="sm"
									checked={options.symbols}
									onCheckedChange={(checked) =>
										setOptions((o) => ({
											...o,
											symbols: checked,
										}))
									}
								/>
							</label>
						</div>

						{/* Advanced Filters */}
						<div className="flex flex-col gap-1.5 pt-2 border-t border-(--p-border-subtle) text-[11px]">
							<label className="flex items-center justify-between gap-2 p-1 rounded-lg text-(--p-text) hover:bg-(--p-surface-hover) cursor-pointer select-none transition-colors">
								<span className="text-[11px] text-(--p-text-subdued)">
									Avoid similar characters (0, O, 1, l, I)
								</span>
								<Switch
									size="sm"
									checked={options.excludeSimilar}
									onCheckedChange={(checked) =>
										setOptions((o) => ({
											...o,
											excludeSimilar: checked,
										}))
									}
								/>
							</label>

							<label className="flex items-center justify-between gap-2 p-1 rounded-lg text-(--p-text) hover:bg-(--p-surface-hover) cursor-pointer select-none transition-colors">
								<span className="text-[11px] text-(--p-text-subdued)">
									Avoid ambiguous brackets & quotes
								</span>
								<Switch
									size="sm"
									checked={options.excludeAmbiguous}
									onCheckedChange={(checked) =>
										setOptions((o) => ({
											...o,
											excludeAmbiguous: checked,
										}))
									}
								/>
							</label>
						</div>
					</div>
				</div>
			) : (
				/* Vault Tab Content */
				<div className="flex-1 flex flex-col gap-3">
					{/* Vault Search & Toolbar */}
					<div className="flex items-center gap-1.5">
						<div className="relative flex-1">
							<SearchIcon
								size={14}
								className="text-(--p-text-subdued) absolute left-2.5 top-2"
							/>
							<input
								type="text"
								value={vaultSearch}
								onChange={(e) => setVaultSearch(e.target.value)}
								placeholder="Search saved passwords..."
								className="w-full pl-7 pr-2 py-1 bg-(--p-surface) border border-(--p-border) rounded-lg text-xs text-(--p-text) placeholder:text-(--p-text-subdued) focus:outline-none focus:border-[#008060]"
							/>
						</div>
						<button
							onClick={handleExportVault}
							title="Export Vault JSON"
							className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover) transition-colors cursor-pointer"
						>
							<DownloadIcon size={16} />
						</button>
						<label
							className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover) transition-colors cursor-pointer inline-flex items-center justify-center"
							title="Import Vault JSON"
						>
							<UploadIcon size={16} />
							<input
								type="file"
								accept=".json"
								onChange={handleImportVault}
								className="hidden"
							/>
						</label>
					</div>

					{/* Vault Entries List */}
					{filteredVault.length === 0 ? (
						<div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-(--p-border) bg-(--p-surface)/50 animate-card-entrance my-auto">
							<LockIcon
								size={28}
								className="text-(--p-text-subdued) mb-2.5"
							/>
							<p className="text-xs font-semibold text-(--p-text)">
								{vaultSearch
									? "No matches found"
									: "Your Vault is empty"}
							</p>
							<p className="text-[11px] text-(--p-text-subdued) mt-0.5 max-w-xs">
								{vaultSearch
									? "Try searching with another keyword"
									: 'Generate a password in the Generator tab and click "Save" to keep it securely in your browser.'}
							</p>
							{!vaultSearch && (
								<Button
									variant="default"
									size="xs"
									onClick={() => setActiveTab("generator")}
									className="mt-3"
								>
									<PlusIcon size={14} className="mr-1" />
									<span>Generate Password</span>
								</Button>
							)}
						</div>
					) : (
						<div className="space-y-2 max-h-96 overflow-y-auto pr-0.5">
							{filteredVault.map((item) => {
								const isRevealed = Boolean(
									revealedVaultIds[item.id],
								)
								return (
									<div
										key={item.id}
										className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-(--p-border) bg-(--p-surface) shadow-xs animate-card-entrance"
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-1.5 overflow-hidden">
												<span className="text-xs font-semibold text-(--p-text) truncate">
													{item.label}
												</span>
												<Badge variant="success">
													{item.strength}
												</Badge>
											</div>
											<div className="flex items-center gap-1">
												<button
													onClick={() =>
														toggleRevealVault(
															item.id,
														)
													}
													className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer"
													title={
														isRevealed
															? "Mask"
															: "Reveal"
													}
												>
													{isRevealed ? (
														<EyeOffIcon size={15} />
													) : (
														<EyeIcon size={15} />
													)}
												</button>
												<button
													onClick={() =>
														handleCopy(
															item.password,
														)
													}
													className="p-1 rounded-lg text-(--p-text-subdued) hover:text-[#008060] cursor-pointer"
													title="Copy Password"
												>
													<CopyIcon size={15} />
												</button>
												<button
													onClick={() =>
														handleDeleteSaved(
															item.id,
														)
													}
													className="p-1 rounded-lg text-(--p-text-subdued) hover:text-[#f87171] cursor-pointer"
													title="Delete from Vault"
												>
													<TrashIcon size={15} />
												</button>
											</div>
										</div>

										<div className="p-1.5 rounded-lg bg-(--p-canvas) border border-(--p-border) font-mono text-xs text-[#008060] dark:text-[#34d399] break-all select-all">
											{isRevealed
												? item.password
												: "••••••••••••••••"}
										</div>

										{item.notes && (
											<p className="text-[10px] text-(--p-text-subdued) italic truncate">
												{item.notes}
											</p>
										)}

										<div className="text-[9px] text-(--p-text-subdued) tabular-nums">
											Saved{" "}
											{new Date(
												item.createdAt,
											).toLocaleDateString()}
										</div>
									</div>
								)
							})}
						</div>
					)}
				</div>
			)}

			{/* Save Modal Dialog with Popover Entrance & Exit Animation */}
			<Modal
				isOpen={isSaving}
				onClose={() => setIsSaving(false)}
				title="Save to Password Vault"
				icon={<BookmarkIcon size={18} className="text-[#008060]" />}
			>
				<form
					onSubmit={handleConfirmSave}
					className="flex flex-col gap-3"
				>
					<div className="flex flex-col gap-2 text-xs">
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-medium text-(--p-text)">
								Account / Service Label{" "}
								<span className="text-[#f87171]">*</span>
							</label>
							<Input
								required
								autoFocus
								value={saveLabel}
								onChange={(e) => setSaveLabel(e.target.value)}
								placeholder="e.g. Staging DB / Redis / Test Account"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-medium text-(--p-text)">
								Password
							</label>
							<Input
								value={currentPassword}
								readOnly
								className="font-mono text-[#008060] dark:text-[#34d399]"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-medium text-(--p-text)">
								Notes (Optional)
							</label>
							<Textarea
								value={saveNotes}
								onChange={(e) => setSaveNotes(e.target.value)}
								placeholder="Optional username, port, or environment info..."
								rows={2}
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setIsSaving(false)}
						>
							Cancel
						</Button>
						<Button type="submit" variant="default" size="sm">
							Save Credential
						</Button>
					</div>
				</form>
			</Modal>
		</div>
	)
}
