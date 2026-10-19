import {useState, useEffect} from "react"
import {
	ArrowLeftIcon,
	SearchIcon,
	HelpIcon,
	CloseIcon,
	ChevronDownIcon,
	SunIcon,
	MoonIcon,
	VaultIcon,
} from "@/components/ui/solar-icon"
import {TOOLS} from "@/data/tools"
import {ToolIcon} from "@/components/ui/tool-icon"
import {useTheme} from "@/context/theme-context"

interface SidebarHeaderProps {
	activeToolId: string | null
	onBackToHome: () => void
	onSelectTool: (toolId: string) => void
	onOpenSupport: (tab: "about" | "crypto") => void
}

export function SidebarHeader({
	activeToolId,
	onBackToHome,
	onSelectTool,
	onOpenSupport,
}: SidebarHeaderProps) {
	const [showQuickMenu, setShowQuickMenu] = useState(false)
	const {theme, toggleTheme} = useTheme()

	// Close popups on Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setShowQuickMenu(false)
			}
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [])

	const activeTool =
		TOOLS.find((t) => t.id === activeToolId) ||
		(activeToolId === "vault"
			? {
					id: "vault",
					name: "Saved Vaults",
					shortName: "Vaults",
					icon: "Vault",
					description:
						"All stored credentials across passwords and 2FA accounts",
					category: "generators" as const,
					tags: ["vault", "passwords", "totp", "credentials"],
					isImplemented: true,
				}
			: null)

	return (
		<>
			<header className="sticky top-0 z-30 flex items-center justify-between px-3 py-2 bg-(--p-surface)/95 backdrop-blur-md border-b border-(--p-border)">
				{activeToolId && activeTool ? (
					/* Sub-tool Header */
					<div className="flex items-center gap-2 overflow-hidden">
						<button
							onClick={onBackToHome}
							className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover) transition-colors cursor-pointer shrink-0"
							title="Back to Home"
						>
							<ArrowLeftIcon size={16} />
						</button>

						<button
							onClick={() => setShowQuickMenu(!showQuickMenu)}
							className="flex items-center gap-1.5 overflow-hidden text-left cursor-pointer group"
						>
							<ToolIcon
								name={activeTool.icon}
								size={16}
								className="text-[#008060] dark:text-[#34d399] shrink-0"
							/>
							<span className="text-xs font-semibold text-(--p-text) truncate group-hover:text-[#008060] dark:group-hover:text-[#34d399] transition-colors">
								{activeTool.shortName}
							</span>
							<ChevronDownIcon
								size={14}
								className="text-(--p-text-subdued) group-hover:text-(--p-text) shrink-0"
							/>
						</button>
					</div>
				) : (
					/* Home Header */
					<div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-colors">
						<img src="/favicon.svg" className="size-4" />
						<div>
							<div className="flex items-center gap-1.5">
								<span className="text-xs font-semibold tracking-tight text-(--p-text)">
									SideDevTools
								</span>
							</div>
						</div>
					</div>
				)}

				{/* Right actions: Search (if inside tool), All Vaults, Theme Toggle (Sun/Moon), Help */}
				<div className="flex items-center gap-1">
					{activeToolId && (
						<button
							onClick={onBackToHome}
							className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover) transition-colors cursor-pointer"
							title="Search Tools"
						>
							<SearchIcon size={16} />
						</button>
					)}

					{/* All Saved Vaults Button (navigates to full Vault page) */}
					<button
						onClick={() => {
							if (activeToolId === "vault") {
								onBackToHome()
							} else {
								onSelectTool("vault")
							}
						}}
						className={`p-1 rounded-lg transition-colors cursor-pointer ${
							activeToolId === "vault"
								? "text-[#008060] dark:text-[#34d399] bg-(--p-surface-hover)"
								: "text-(--p-text-subdued) hover:text-[#008060] dark:hover:text-[#34d399] hover:bg-(--p-surface-hover)"
						}`}
						title={
							activeToolId === "vault"
								? "Back to Home"
								: "All Saved Vaults (Passwords & 2FA)"
						}
						aria-label="View All Saved Vaults"
					>
						<VaultIcon size={16} />
					</button>

					{/* Theme Toggle Button (placed to the left of Support & Help) */}
					<button
						onClick={toggleTheme}
						className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover) transition-colors cursor-pointer"
						title={
							theme === "dark"
								? "Switch to Light mode"
								: "Switch to Dark mode"
						}
						aria-label="Toggle theme"
					>
						{theme === "dark" ? (
							<SunIcon size={16} className="text-amber-400" />
						) : (
							<MoonIcon size={16} className="text-indigo-600" />
						)}
					</button>

					{/* Help & About Button */}
					<button
						onClick={() => onOpenSupport("about")}
						className="p-1 rounded-lg text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover) transition-colors cursor-pointer"
						title="About SideDevTools & Left Sidebar Guide"
						aria-label="About SideDevTools & Guide"
					>
						<HelpIcon size={16} />
					</button>
				</div>
			</header>

			{/* Quick Tool Switcher Dropdown with Click-Outside Backdrop */}
			{showQuickMenu && (
				<>
					<div
						className="fixed inset-0 z-30 bg-transparent"
						onClick={() => setShowQuickMenu(false)}
					/>
					<div className="fixed inset-x-2 top-11 z-40 p-1.5 rounded-lg bg-(--p-surface) border border-(--p-border) shadow-xl animate-modal-pop">
						<div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase text-(--p-text-subdued) border-b border-(--p-border-subtle)">
							<span>Switch DevTool</span>
							<button
								onClick={() => setShowQuickMenu(false)}
								className="text-(--p-text-subdued) hover:text-(--p-text) cursor-pointer"
							>
								<CloseIcon size={14} />
							</button>
						</div>
						<div className="space-y-0.5 mt-1 max-h-60 overflow-y-auto">
							{TOOLS.map((t) => (
								<button
									key={t.id}
									onClick={() => {
										onSelectTool(t.id)
										setShowQuickMenu(false)
									}}
									className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
										activeToolId === t.id
											? "bg-[#008060] text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
											: "text-(--p-text) hover:bg-(--p-surface-hover)"
									}`}
								>
									<ToolIcon
										name={t.icon}
										size={15}
										className="shrink-0"
									/>
									<span className="text-xs truncate">
										{t.name}
									</span>
								</button>
							))}
						</div>
					</div>
				</>
			)}
		</>
	)
}
