import {useState, useEffect, useMemo} from "react"
import * as OTPAuth from "otpauth"
import {
	VaultIcon,
	LockIcon,
	QrCodeIcon,
	CopyIcon,
	CheckIcon,
	EyeIcon,
	EyeOffIcon,
	SearchIcon,
	ChevronRightIcon,
	TrashIcon,
} from "@/components/ui/solar-icon"
import {Button} from "@/components/ui/button"
import {useToast} from "@/components/ui/toast"

interface SavedPassword {
	id: string
	label: string
	password: string
	notes?: string
	createdAt: number
	strength?: string
}

interface SavedTotpAccount {
	id: string
	label: string
	issuer: string
	secret: string
	algorithm: "SHA1" | "SHA256" | "SHA512"
	digits: number
	period: number
	createdAt: number
}

interface VaultViewProps {
	onSelectTool: (toolId: string) => void
}

type VaultTab = "all" | "passwords" | "totp"

export function VaultView({onSelectTool}: VaultViewProps) {
	const [activeTab, setActiveTab] = useState<VaultTab>("all")
	const [searchQuery, setSearchQuery] = useState("")
	const [passwords, setPasswords] = useState<SavedPassword[]>(() => {
		try {
			const pwData = localStorage.getItem("SideDevTools_password_vault")
			return pwData ? JSON.parse(pwData) : []
		} catch {
			return []
		}
	})
	const [totpAccounts, setTotpAccounts] = useState<SavedTotpAccount[]>(() => {
		try {
			const totpData = localStorage.getItem("SideDevTools_totp_accounts")
			return totpData ? JSON.parse(totpData) : []
		} catch {
			return []
		}
	})
	const [revealedPasswords, setRevealedPasswords] = useState<
		Record<string, boolean>
	>({})
	const [revealedSecrets, setRevealedSecrets] = useState<
		Record<string, boolean>
	>({})
	const [copiedKey, setCopiedKey] = useState<string | null>(null)
	const [now, setNow] = useState(() => Date.now())

	const {showToast} = useToast()

	// Sync deletion back to localStorage
	useEffect(() => {
		try {
			localStorage.setItem(
				"SideDevTools_password_vault",
				JSON.stringify(passwords),
			)
		} catch {}
	}, [passwords])

	useEffect(() => {
		try {
			localStorage.setItem(
				"SideDevTools_totp_accounts",
				JSON.stringify(totpAccounts),
			)
		} catch {}
	}, [totpAccounts])

	// Tick timer for TOTP countdowns
	useEffect(() => {
		const interval = setInterval(() => {
			setNow(Date.now())
		}, 1000)
		return () => clearInterval(interval)
	}, [])

	// Filtered passwords
	const filteredPasswords = useMemo(() => {
		const q = searchQuery.toLowerCase().trim()
		if (!q) return passwords
		return passwords.filter(
			(p) =>
				p.label.toLowerCase().includes(q) ||
				(p.notes && p.notes.toLowerCase().includes(q)),
		)
	}, [passwords, searchQuery])

	// Filtered TOTP accounts
	const filteredTotp = useMemo(() => {
		const q = searchQuery.toLowerCase().trim()
		if (!q) return totpAccounts
		return totpAccounts.filter(
			(t) =>
				t.label.toLowerCase().includes(q) ||
				t.issuer.toLowerCase().includes(q) ||
				t.secret.toLowerCase().includes(q),
		)
	}, [totpAccounts, searchQuery])

	const totalCount = passwords.length + totpAccounts.length

	const handleCopy = (text: string, key: string, name: string) => {
		if (!text) return
		navigator.clipboard.writeText(text)
		setCopiedKey(key)
		showToast(`${name} copied`, "success")
		setTimeout(() => setCopiedKey(null), 1200)
	}

	const handleDeletePassword = (id: string) => {
		setPasswords((prev) => prev.filter((p) => p.id !== id))
		showToast("Password deleted from vault", "info")
	}

	const handleDeleteTotp = (id: string) => {
		setTotpAccounts((prev) => prev.filter((t) => t.id !== id))
		showToast("TOTP account deleted from vault", "info")
	}

	return (
		<div className="flex-1 flex flex-col gap-3 p-3 animate-card-entrance">
			{/* Search & Tabs Toolbar */}
			<div className="flex flex-col gap-2 p-2.5 rounded-lg border border-(--p-border) bg-(--p-surface) shadow-xs">
				{/* Search Input */}
				<div className="relative">
					<SearchIcon
						size={14}
						className="text-(--p-text-subdued) absolute left-2.5 top-2 pointer-events-none"
					/>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search credentials across all vaults..."
						className="w-full pl-7 pr-3 py-1 bg-(--p-canvas) border border-(--p-border) rounded-lg text-xs text-(--p-text) placeholder:text-(--p-text-subdued) focus:outline-none focus:border-[#008060] transition-colors"
					/>
				</div>

				{/* Segmented Category Tabs */}
				<div className="flex items-center gap-1 p-0.5 bg-(--p-surface-subdued) border border-(--p-border) rounded-lg">
					{(
						[
							{id: "all", label: "All Items", count: totalCount},
							{
								id: "passwords",
								label: "Passwords",
								count: passwords.length,
							},
							{
								id: "totp",
								label: "TOTP 2FA",
								count: totpAccounts.length,
							},
						] as const
					).map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
								activeTab === tab.id
									? "bg-[#008060] text-white shadow-xs font-semibold"
									: "text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)"
							}`}
						>
							<span>{tab.label}</span>
							<span className="text-[9px] tabular-nums opacity-85">
								({tab.count})
							</span>
						</button>
					))}
				</div>
			</div>

			{/* Vault List Content */}
			{totalCount === 0 ? (
				/* Empty Vault View */
				<div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-(--p-border) bg-(--p-surface)/50 my-auto animate-card-entrance">
					<VaultIcon
						size={32}
						className="text-(--p-text-subdued) mb-2 opacity-60"
					/>
					<p className="text-xs font-semibold text-(--p-text)">
						Your Vault is empty
					</p>
					<p className="text-[11px] text-(--p-text-subdued) mt-0.5 max-w-xs mb-4">
						Save passwords or add two-factor TOTP accounts to store
						them locally and securely on your device.
					</p>
					<div className="flex items-center gap-2">
						<Button
							variant="secondary"
							size="xs"
							onClick={() => onSelectTool("password-generator")}
							className="px-3"
						>
							<LockIcon size={14} />
							<span>Open Passwords</span>
						</Button>
						<Button
							variant="default"
							size="xs"
							onClick={() => onSelectTool("totp-generator")}
							className="px-3"
						>
							<QrCodeIcon size={14} />
							<span>Open TOTP</span>
						</Button>
					</div>
				</div>
			) : (
				<div className="flex-1 flex flex-col gap-3">
					{/* Passwords Section */}
					{(activeTab === "all" || activeTab === "passwords") &&
						filteredPasswords.length > 0 && (
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between text-[10px] font-semibold uppercase text-(--p-text-subdued) px-0.5">
									<div className="flex items-center gap-1">
										<LockIcon size={12} />
										<span>Saved Passwords</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="tabular-nums">
											{filteredPasswords.length}
										</span>
										<button
											onClick={() =>
												onSelectTool(
													"password-generator",
												)
											}
											className="text-[10px] text-[#008060] dark:text-[#34d399] hover:underline cursor-pointer font-medium lowercase"
										>
											+ add
										</button>
									</div>
								</div>

								<div className="flex flex-col rounded-lg border border-(--p-border) bg-(--p-surface) divide-y divide-(--p-border-subtle) overflow-hidden shadow-xs">
									{filteredPasswords.map((item) => {
										const isRevealed = Boolean(
											revealedPasswords[item.id],
										)
										const isCopied =
											copiedKey === `pw-${item.id}`
										return (
											<div
												key={item.id}
												className="p-2.5 flex items-center justify-between hover:bg-(--p-surface-hover) transition-colors group"
											>
												<div className="overflow-hidden flex flex-col gap-0.5 pr-2">
													<div className="flex items-center gap-1.5">
														<span className="text-xs font-semibold text-(--p-text) truncate">
															{item.label}
														</span>
														{item.strength && (
															<span className="text-[9px] px-1 py-0.2 rounded bg-(--p-canvas) border border-(--p-border) text-(--p-text-subdued)">
																{item.strength}
															</span>
														)}
													</div>
													<span className="font-mono text-[11px] text-(--p-text-subdued) tracking-wider">
														{isRevealed
															? item.password
															: "••••••••••••••••"}
													</span>
													{item.notes && (
														<span className="text-[10px] text-(--p-text-subdued) truncate">
															{item.notes}
														</span>
													)}
												</div>

												<div className="flex items-center gap-0 shrink-0">
													<button
														onClick={() =>
															handleCopy(
																item.password,
																`pw-${item.id}`,
																item.label,
															)
														}
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] cursor-pointer"
														title="Copy password"
													>
														{isCopied ? (
															<CheckIcon
																size={14}
																className="text-[#008060] dark:text-[#34d399]"
															/>
														) : (
															<CopyIcon
																size={14}
															/>
														)}
													</button>

													<button
														onClick={() =>
															onSelectTool(
																"password-generator",
															)
														}
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer"
														title="Open in Password Generator"
													>
														<ChevronRightIcon
															size={14}
														/>
													</button>
													<button
														onClick={() =>
															setRevealedPasswords(
																(prev) => ({
																	...prev,
																	[item.id]:
																		!prev[
																			item
																				.id
																		],
																}),
															)
														}
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer"
														title={
															isRevealed
																? "Hide password"
																: "Reveal password"
														}
													>
														{isRevealed ? (
															<EyeOffIcon
																size={14}
															/>
														) : (
															<EyeIcon
																size={14}
															/>
														)}
													</button>

													<button
														onClick={() =>
															handleDeletePassword(
																item.id,
															)
														}
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-rose-500 cursor-pointer"
														title="Delete Password"
													>
														<TrashIcon size={14} />
													</button>
												</div>
											</div>
										)
									})}
								</div>
							</div>
						)}

					{/* TOTP Accounts Section */}
					{(activeTab === "all" || activeTab === "totp") &&
						filteredTotp.length > 0 && (
							<div className="flex flex-col gap-1.5 mt-1">
								<div className="flex items-center justify-between text-[10px] font-semibold uppercase text-(--p-text-subdued) px-0.5">
									<div className="flex items-center gap-1">
										<QrCodeIcon size={12} />
										<span>Saved TOTP 2FA Accounts</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="tabular-nums">
											{filteredTotp.length}
										</span>
										<button
											onClick={() =>
												onSelectTool("totp-generator")
											}
											className="text-[10px] text-[#008060] dark:text-[#34d399] hover:underline cursor-pointer font-medium lowercase"
										>
											+ add
										</button>
									</div>
								</div>

								<div className="flex flex-col rounded-lg border border-(--p-border) bg-(--p-surface) divide-y divide-(--p-border-subtle) overflow-hidden shadow-xs">
									{filteredTotp.map((acc) => {
										let code = "------"
										const period = acc.period || 30
										const remainingSec =
											period -
											(Math.floor(now / 1000) % period)
										try {
											const totp = new OTPAuth.TOTP({
												issuer: acc.issuer || undefined,
												label: acc.label || undefined,
												algorithm: acc.algorithm,
												digits: acc.digits,
												period: acc.period,
												secret: OTPAuth.Secret.fromBase32(
													acc.secret
														.replace(/[\s-]/g, "")
														.toUpperCase(),
												),
											})
											code = totp.generate({
												timestamp: now,
											})
										} catch {}

										const formatted =
											code.length === 6
												? `${code.slice(0, 3)} ${code.slice(3)}`
												: code
										const isCopied =
											copiedKey === `totp-${acc.id}`
										const isSecretRevealed = Boolean(
											revealedSecrets[acc.id],
										)

										return (
											<div
												key={acc.id}
												className="p-2.5 flex items-center justify-between hover:bg-(--p-surface-hover) transition-colors group"
											>
												<div className="overflow-hidden flex flex-col gap-0.5 pr-2">
													<div className="flex items-center gap-1.5">
														<span className="text-xs font-semibold text-(--p-text) truncate">
															{acc.issuer ||
																acc.label}
														</span>
														{acc.issuer &&
															acc.label && (
																<span className="text-[10px] text-(--p-text-subdued) truncate">
																	•{" "}
																	{acc.label}
																</span>
															)}
													</div>
													<div className="flex items-center gap-2">
														<span className="font-mono text-sm font-semibold tracking-wider text-(--p-text) tabular-nums group-hover:text-[#008060] dark:group-hover:text-[#34d399] transition-colors">
															{formatted}
														</span>
														<span
															className={`text-[10px] font-semibold tabular-nums ${
																remainingSec <=
																5
																	? "text-rose-500 animate-pulse"
																	: "text-(--p-text-subdued)"
															}`}
														>
															{remainingSec}s
														</span>
													</div>
													<span className="font-mono text-[10px] text-(--p-text-subdued) tracking-wider">
														{isSecretRevealed
															? acc.secret
															: "••••••••••••••••"}
													</span>
												</div>

												<div className="flex items-center gap-0 shrink-0">
													<button
														onClick={() =>
															handleCopy(
																code,
																`totp-${acc.id}`,
																acc.issuer ||
																	acc.label,
															)
														}
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] cursor-pointer"
														title="Copy TOTP Code"
													>
														{isCopied ? (
															<CheckIcon
																size={14}
																className="text-[#008060] dark:text-[#34d399]"
															/>
														) : (
															<CopyIcon
																size={14}
															/>
														)}
													</button>

													<button
														onClick={() =>
															onSelectTool(
																"totp-generator",
															)
														}
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer"
														title="Open in TOTP Authenticator"
													>
														<ChevronRightIcon
															size={14}
														/>
													</button>
													<button
														onClick={() =>
															setRevealedSecrets(
																(prev) => ({
																	...prev,
																	[acc.id]:
																		!prev[
																			acc
																				.id
																		],
																}),
															)
														}
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer"
														title={
															isSecretRevealed
																? "Hide Secret"
																: "Reveal Secret"
														}
													>
														{isSecretRevealed ? (
															<EyeOffIcon
																size={14}
															/>
														) : (
															<EyeIcon
																size={14}
															/>
														)}
													</button>

													<button
														onClick={() =>
															handleDeleteTotp(
																acc.id,
															)
														}
														className="p-1 rounded-lg text-(--p-text-subdued) hover:text-rose-500 cursor-pointer"
														title="Delete Account"
													>
														<TrashIcon size={14} />
													</button>
												</div>
											</div>
										)
									})}
								</div>
							</div>
						)}

					{/* No Search Results */}
					{searchQuery &&
						filteredPasswords.length === 0 &&
						filteredTotp.length === 0 && (
							<div className="py-12 flex flex-col items-center justify-center text-center">
								<p className="text-xs font-semibold text-(--p-text)">
									No credentials matched &quot;{searchQuery}
									&quot;
								</p>
								<p className="text-[10px] text-(--p-text-subdued) mt-0.5">
									Try searching by label, email, or issuer.
								</p>
							</div>
						)}
				</div>
			)}
		</div>
	)
}
