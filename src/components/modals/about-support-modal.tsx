import {useState, useEffect, useRef} from "react"
import QRCode from "qrcode"
import {Modal} from "@/components/ui/modal"
import {Button} from "@/components/ui/button"
import {useToast} from "@/components/ui/toast"
import {
	TerminalIcon,
	HeartIcon,
	CopyIcon,
	CheckIcon,
	ShieldIcon,
	HelpIcon,
	WalletIcon,
} from "@/components/ui/solar-icon"

export interface AboutSupportModalProps {
	isOpen: boolean
	onClose: () => void
	initialTab?: "about" | "crypto"
}

interface CryptoWalletOption {
	id: "evm" | "solana" | "tron"
	name: string
	symbol: string
	badge: string
	address: string
	supportedTokens: string
	networks: string[]
	accentColor: string
}

const WALLETS: CryptoWalletOption[] = [
	{
		id: "evm",
		name: "EVM Multi-Chain",
		symbol: "ETH / USDT / USDC",
		badge: "Lowest Gas (Arbitrum/Polygon)",
		address: "0x6d7C21d38A8588DC9b2dBcd482e1004026D398F1",
		supportedTokens: "USDT, USDC, ETH, BNB",
		networks: [
			"Arbitrum One",
			"Polygon",
			"BNB Chain",
			"Base",
			"Optimism",
			"Ethereum",
		],
		accentColor: "#008060",
	},
	{
		id: "solana",
		name: "Solana",
		symbol: "SOL / USDC",
		badge: "Instant & Sub-Cent Fee",
		address: "HUNkvMSv9LAVuwsxDDifnGtbmRuhggW8oojAXpp3Mivc",
		supportedTokens: "SOL, USDC-SPL",
		networks: ["Solana Network"],
		accentColor: "#8b5cf6",
	},
	{
		id: "tron",
		name: "TRON (TRC20)",
		symbol: "USDT TRC-20",
		badge: "USDT TRC20",
		address: "TSSeFXhdW48fxxKeYruJaoGbvPbfr3ftge",
		supportedTokens: "USDT (TRC-20)",
		networks: ["TRON Network"],
		accentColor: "#ef4444",
	},
]

export function AboutSupportModal({
	isOpen,
	onClose,
	initialTab = "about",
}: AboutSupportModalProps) {
	const [activeTab, setActiveTab] = useState<"about" | "crypto">(initialTab)
	const [selectedWalletId, setSelectedWalletId] = useState<
		"evm" | "solana" | "tron"
	>("evm")
	const [copiedAddress, setCopiedAddress] = useState(false)
	const [copiedEmail, setCopiedEmail] = useState(false)
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const {showToast} = useToast()

	// Sync initialTab when modal opens
	useEffect(() => {
		if (isOpen) {
			setActiveTab(initialTab)
		}
	}, [isOpen, initialTab])

	const currentWallet =
		WALLETS.find((w) => w.id === selectedWalletId) || WALLETS[0]

	// Draw QR Code on canvas
	useEffect(() => {
		if (
			isOpen &&
			activeTab === "crypto" &&
			canvasRef.current &&
			currentWallet
		) {
			QRCode.toCanvas(
				canvasRef.current,
				currentWallet.address,
				{
					width: 140,
					margin: 1,
					color: {
						dark: "#141517",
						light: "#ffffff",
					},
				},
				(error) => {
					if (error) console.error("Error generating QR code:", error)
				},
			)
		}
	}, [isOpen, activeTab, currentWallet])

	const handleCopyAddress = async () => {
		try {
			await navigator.clipboard.writeText(currentWallet.address)
			setCopiedAddress(true)
			showToast(`Copied ${currentWallet.name} address!`, "success")
			setTimeout(() => setCopiedAddress(false), 1500)
		} catch {
			showToast("Failed to copy address", "error")
		}
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="SideDevTools"
			icon={
				activeTab === "crypto" ? (
					<HeartIcon size={18} className="text-rose-500" />
				) : (
					<TerminalIcon
						size={18}
						className="text-[#008060] dark:text-[#34d399]"
					/>
				)
			}
		>
			<div className="flex flex-col gap-3 text-xs text-(--p-text)">
				{/* Top Tab Bar */}
				<div className="flex items-center gap-1 p-0.5 rounded-lg bg-(--p-canvas) border border-(--p-border)">
					<button
						onClick={() => setActiveTab("about")}
						className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
							activeTab === "about"
								? "bg-(--p-surface) text-(--p-text) shadow-xs"
								: "text-(--p-text-subdued) hover:text-(--p-text)"
						}`}
					>
						<HelpIcon size={14} />
						<span>About & Guide</span>
					</button>
					<button
						onClick={() => setActiveTab("crypto")}
						className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
							activeTab === "crypto"
								? "bg-(--p-surface) text-rose-600 dark:text-rose-400 shadow-xs"
								: "text-(--p-text-subdued) hover:text-(--p-text)"
						}`}
					>
						<HeartIcon size={14} className="text-rose-500" />
						<span>Tip via Crypto</span>
					</button>
				</div>

				{/* Tab 1: About & Guide */}
				{activeTab === "about" && (
					<div className="space-y-2.5 animate-card-entrance text-[11px]">
						{/* App Headline */}
						<div className="p-2.5 rounded-lg bg-(--p-canvas) border border-(--p-border) flex items-start gap-2.5">
							<div className="w-8 h-8 rounded-lg bg-[#008060]/10 flex items-center justify-center shrink-0 text-[#008060] dark:text-[#34d399]">
								<TerminalIcon size={18} />
							</div>
							<div className="flex flex-col">
								<div className="flex items-center gap-1.5">
									<span className="font-semibold text-xs text-(--p-text)">
										SideDevTools
									</span>
									<span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[#008060]/15 text-[#008060] dark:text-[#34d399] font-medium">
										v1.2.0
									</span>
								</div>
								<span className="text-[10px] text-(--p-text-subdued)">
									Privacy-First Developer Companion
								</span>
							</div>
						</div>

						{/* Left Sidebar Docking Guide */}
						<div className="p-2.5 rounded-lg bg-[#008060]/10 border border-[#008060]/30 space-y-1.5">
							<p className="font-semibold text-[#008060] dark:text-[#34d399]">
								Docking to Chrome&apos;s Left Side:
							</p>
							<ol className="list-decimal list-inside space-y-0.5 text-(--p-text) text-[10px] leading-relaxed">
								<li>
									Open Chrome <b>Settings</b>.
								</li>
								<li>
									Click <b>Appearance</b> on the left
									navigation menu.
								</li>
								<li>
									Under <b>Side panel</b> select: &quot;Show
									on left side&quot;
								</li>
							</ol>
						</div>

						{/* Shortcut info */}
						<div className="flex items-center justify-between p-2 rounded-lg bg-(--p-canvas) border border-(--p-border) text-[10px]">
							<span className="text-(--p-text-subdued)">
								Toggle Sidebar Shortcut:
							</span>
							<kbd className="px-1.5 py-0.5 rounded-md bg-(--p-surface) border border-(--p-border) text-(--p-text) tabular-nums font-mono font-semibold flex items-center gap-px">
								<span className="text-sm mb-px">⌘</span>
								<span>+Shift+D / Ctrl+Shift+D</span>
							</kbd>
						</div>

						{/* Privacy Commitment */}
						<div className="p-2 rounded-lg bg-(--p-canvas) border border-(--p-border) flex items-center gap-2 text-[10px]">
							<ShieldIcon
								size={16}
								className="text-[#008060] dark:text-[#34d399] shrink-0"
							/>
							<span className="text-(--p-text-subdued) leading-tight">
								<b className="text-(--p-text)">
									100% Client-Side:
								</b>{" "}
								All AI models, TOTP algorithms, parser
								computations, and vaults run locally in your
								browser sandbox with zero telemetry.
							</span>
						</div>

						{/* Developer & Contact Card */}
						<div className="p-2.5 rounded-lg border border-(--p-border) bg-(--p-surface) space-y-1.5">
							<div className="text-[10px] uppercase font-semibold tracking-wider text-(--p-text-subdued)">
								Developer & Feedback
							</div>
							<div className="flex items-center justify-between text-[11px]">
								<div className="flex items-center gap-1">
									<span className="text-(--p-text-subdued)">
										Created by:
									</span>
									<a
										href="https://github.com/rasyidly"
										target="_blank"
										rel="noreferrer"
										className="font-semibold text-(--p-text) hover:text-[#008060] dark:hover:text-[#34d399] transition-colors"
									>
										rasyidly
									</a>
								</div>
								<a
									href="https://github.com/rasyidly/sidedevtools"
									target="_blank"
									rel="noreferrer"
									className="text-[10px] text-(--p-text-subdued) hover:text-(--p-text) transition-colors"
								>
									GitHub Repository ↗
								</a>
							</div>
						</div>
					</div>
				)}

				{/* Tab 2: Tip via Crypto (Bitget Wallet & Multi-chain) */}
				{activeTab === "crypto" && (
					<div className="space-y-2.5 animate-card-entrance text-[11px]">
						{/* Encouragement message */}
						<div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-start gap-2">
							<HeartIcon
								size={16}
								className="text-rose-500 shrink-0 mt-0.5"
							/>
							<div className="text-[10px] text-(--p-text) leading-relaxed">
								If <b>SideDevTools</b> saves you time during
								daily coding, consider buying me a coffee or
								tipping via crypto. Built with love by{" "}
								<b>rasyidly</b>.
							</div>
						</div>

						{/* Chain Switcher Pills */}
						<div className="grid grid-cols-3 gap-1">
							{WALLETS.map((w) => (
								<button
									key={w.id}
									onClick={() => setSelectedWalletId(w.id)}
									className={`p-1.5 rounded-lg border text-left cursor-pointer transition-all ${
										selectedWalletId === w.id
											? "border-[#008060] bg-[#008060]/10 text-(--p-text) font-semibold shadow-xs"
											: "border-(--p-border) bg-(--p-surface) text-(--p-text-subdued) hover:bg-(--p-surface-hover) hover:text-(--p-text)"
									}`}
								>
									<div className="text-[11px] truncate">
										{w.name}
									</div>
									<div className="text-[9px] opacity-75 mt-0.5 truncate">
										{w.symbol}
									</div>
								</button>
							))}
						</div>

						{/* QR Code and Wallet Details Box */}
						<div className="p-3 rounded-xl border border-(--p-border) bg-(--p-surface) flex flex-col items-center gap-2.5 shadow-xs">
							{/* Canvas QR Code wrapped in clean card */}
							<div className="p-2 rounded-lg bg-white border border-gray-200 shadow-xs flex items-center justify-center">
								<canvas
									ref={canvasRef}
									className="block w-[140px] h-[140px]"
								/>
							</div>

							{/* Network Badge */}
							<div className="flex flex-col items-center gap-1.5 text-[11px]">
								<span className="font-semibold text-(--p-text)">
									{currentWallet.name}
								</span>
								<span className="px-1.5 py-0.2 rounded-full text-[9px] bg-(--p-canvas) border border-(--p-border) text-(--p-text-subdued) font-medium">
									{currentWallet.badge}
								</span>
							</div>

							{/* Public Deposit Address Bar */}
							<div className="w-full flex flex-col gap-1">
								<span className="text-[9px] uppercase font-semibold text-(--p-text-subdued)">
									Deposit Address
								</span>
								<div className="flex items-center gap-1 p-1.5 rounded-lg bg-(--p-canvas) border border-(--p-border)">
									<code className="font-mono text-[10px] text-(--p-text) break-all select-all flex-1 tabular-nums leading-tight px-1">
										{currentWallet.address}
									</code>
									<Button
										variant="default"
										size="xs"
										onClick={handleCopyAddress}
										className="shrink-0 h-6 px-2 text-[10px]"
									>
										{copiedAddress ? (
											<>
												<CheckIcon
													size={12}
													className="mr-1"
												/>
												Copied
											</>
										) : (
											<>
												<CopyIcon
													size={12}
													className="mr-1"
												/>
												Copy
											</>
										)}
									</Button>
								</div>
							</div>

							{/* Supported Networks & Tokens hint */}
							<div className="w-full text-[10px] text-(--p-text-subdued) space-y-0.5 pt-1">
								<div className="flex items-center justify-between">
									<span>Supported Tokens:</span>
									<span className="font-medium text-(--p-text)">
										{currentWallet.supportedTokens}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span>Compatible with:</span>
									<span className="font-medium text-(--p-text)">
										Bitget Wallet, MetaMask, Phantom, Trust
										Wallet
									</span>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Modal Footer */}
				<div className="flex items-center justify-between pt-1">
					<div className="flex items-center gap-1 text-[10px] text-(--p-text-subdued)">
						<WalletIcon
							size={13}
							className="text-[#008060] dark:text-[#34d399]"
						/>
						<span>Bitget & Web3 Multi-Chain</span>
					</div>
					<Button
						variant="ghost"
						size="xs"
						onClick={onClose}
						className="px-3 text-xs"
					>
						Close
					</Button>
				</div>
			</div>
		</Modal>
	)
}
