import {Suspense, lazy, useState, useEffect} from "react"
import {ToastProvider} from "@/components/ui/toast"
import {SidebarHeader} from "@/components/layout/sidebar-header"
import {HomeView} from "@/components/home-view"
import {PasswordGeneratorView} from "@/tools/password-generator"
import {EncodeDecodeView} from "@/tools/encode-decode"
import {IdGeneratorView} from "@/tools/id-generator"
import {JsonFormatterView} from "@/tools/json-formatter"
import {HashGeneratorView} from "@/tools/hash-generator"
import {TotpGeneratorView} from "@/tools/totp-generator"
import {DateTimeParserView} from "@/tools/datetime-parser"
import {MarkdownConverterView} from "@/tools/markdown-converter"
import {FaviconGeneratorView} from "@/tools/favicon-generator"
import {MetaOgCheckerView} from "@/tools/meta-og-checker"
import {HttpRequestConverterView} from "@/tools/http-request-converter"
import {TabStorageManagerView} from "@/tools/tab-storage-manager"
import {ColorToolkitView} from "@/tools/color-toolkit"
import {RegexTesterView} from "@/tools/regex-tester"
import {VaultView} from "@/views/vault-view"
import {AboutSupportModal} from "@/components/modals/about-support-modal"

const BackgroundRemoverView = lazy(() =>
	import("@/tools/background-remover").then((m) => ({
		default: m.BackgroundRemoverView,
	})),
)

// The Form Filler pulls in the faker engine and its locales, so it is split out
// and only downloaded when the user actually opens it.
const FormFillerView = lazy(() =>
	import("@/tools/form-filler").then((m) => ({
		default: m.FormFillerView,
	})),
)

const QrBarcodeView = lazy(() =>
	import("@/tools/qr-barcode").then((m) => ({
		default: m.QrBarcodeView,
	})),
)

function ToolLoading({label}: {label: string}) {
	return (
		<div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
			<div className="w-8 h-8 rounded-full border-2 border-(--p-border) border-t-[#008060] animate-spin mb-2" />
			<span className="text-xs text-(--p-text-subdued)">Loading {label}...</span>
		</div>
	)
}

export function App() {
	const [activeToolId, setActiveToolId] = useState<string | null>(null)
	const [supportModal, setSupportModal] = useState<{
		isOpen: boolean
		tab: "about" | "crypto"
	}>({
		isOpen: false,
		tab: "about",
	})
	const [favorites, setFavorites] = useState<string[]>(() => {
		try {
			const saved = localStorage.getItem("SideDevTools_favorites")
			return saved
				? JSON.parse(saved)
				: ["password-generator", "encode-decode", "id-generator"]
		} catch {
			return ["password-generator", "encode-decode", "id-generator"]
		}
	})
	const [recentToolIds, setRecentToolIds] = useState<string[]>(() => {
		try {
			const saved = localStorage.getItem("SideDevTools_recents")
			return saved
				? JSON.parse(saved)
				: ["password-generator", "encode-decode", "id-generator"]
		} catch {
			return ["password-generator", "encode-decode", "id-generator"]
		}
	})

	// Sync favorites & recents to localStorage
	useEffect(() => {
		try {
			localStorage.setItem(
				"SideDevTools_favorites",
				JSON.stringify(favorites),
			)
		} catch {}
	}, [favorites])

	useEffect(() => {
		try {
			localStorage.setItem(
				"SideDevTools_recents",
				JSON.stringify(recentToolIds),
			)
		} catch {}
	}, [recentToolIds])

	const handleSelectTool = (toolId: string) => {
		setActiveToolId(toolId)
		setRecentToolIds((prev) => {
			const next = [toolId, ...prev.filter((id) => id !== toolId)]
			return next.slice(0, 10)
		})
	}

	const handleToggleFavorite = (toolId: string) => {
		setFavorites((prev) =>
			prev.includes(toolId)
				? prev.filter((id) => id !== toolId)
				: [...prev, toolId],
		)
	}

	const handleOpenSupport = (tab: "about" | "crypto" = "about") => {
		setSupportModal({isOpen: true, tab})
	}

	return (
		<ToastProvider>
			<div className="flex flex-col min-h-screen w-full bg-(--p-canvas) text-(--p-text) text-xs select-none antialiased">
				{/* Sticky Header with Navigation, Quick Switcher, and Theme Toggle */}
				<SidebarHeader
					activeToolId={activeToolId}
					onBackToHome={() => setActiveToolId(null)}
					onSelectTool={handleSelectTool}
					onOpenSupport={handleOpenSupport}
				/>

				{/* Content area with fluid page entrance animations on navigation changes */}
				<main className="flex-1 flex flex-col">
					<div
						key={activeToolId || "home"}
						className="flex-1 flex flex-col animate-page-entrance min-h-0"
					>
						{!activeToolId && (
							<HomeView
								onSelectTool={handleSelectTool}
								recentToolIds={recentToolIds}
								favorites={favorites}
								onToggleFavorite={handleToggleFavorite}
								onOpenSupport={handleOpenSupport}
							/>
						)}

						{activeToolId === "password-generator" && (
							<PasswordGeneratorView />
						)}
						{activeToolId === "encode-decode" && (
							<EncodeDecodeView />
						)}
						{activeToolId === "id-generator" && <IdGeneratorView />}
						{activeToolId === "json-formatter" && (
							<JsonFormatterView />
						)}
						{activeToolId === "hash-generator" && (
							<HashGeneratorView />
						)}
						{activeToolId === "totp-generator" && (
							<TotpGeneratorView />
						)}
						{activeToolId === "datetime-parser" && (
							<DateTimeParserView />
						)}
						{activeToolId === "markdown-converter" && (
							<MarkdownConverterView />
						)}
						{activeToolId === "favicon-generator" && (
							<FaviconGeneratorView />
						)}
						{activeToolId === "meta-og-checker" && (
							<MetaOgCheckerView />
						)}
						{activeToolId === "http-request-converter" && (
							<HttpRequestConverterView />
						)}
						{activeToolId === "tab-storage-manager" && (
							<TabStorageManagerView />
						)}
						{activeToolId === "color-toolkit" && <ColorToolkitView />}
						{activeToolId === "regex-tester" && <RegexTesterView />}
						{activeToolId === "qr-barcode" && (
							<Suspense fallback={<ToolLoading label="QR & Barcode" />}>
								<QrBarcodeView />
							</Suspense>
						)}
						{activeToolId === "form-filler" && (
							<Suspense fallback={<ToolLoading label="Form Filler" />}>
								<FormFillerView />
							</Suspense>
						)}
						{activeToolId === "vault" && (
							<VaultView onSelectTool={handleSelectTool} />
						)}
						{activeToolId === "background-remover" && (
							<Suspense
								fallback={
									<div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
										<div className="w-8 h-8 rounded-full border-2 border-(--p-border) border-t-[#008060] animate-spin mb-2" />
										<span className="text-xs text-(--p-text-subdued)">
											Loading Background Remover...
										</span>
									</div>
								}
							>
								<BackgroundRemoverView />
							</Suspense>
						)}
					</div>
				</main>

				{/* Root About & Crypto Support Modal */}
				<AboutSupportModal
					isOpen={supportModal.isOpen}
					onClose={() =>
						setSupportModal((prev) => ({...prev, isOpen: false}))
					}
					initialTab={supportModal.tab}
				/>
			</div>
		</ToastProvider>
	)
}

export default App
