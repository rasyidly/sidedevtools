import * as React from "react"
import {
	CheckIcon,
	AlertIcon,
	InfoIcon,
	CloseIcon,
} from "@/components/ui/solar-icon"
import {cn} from "@/lib/utils"

export type ToastType = "success" | "error" | "info"

export interface ToastItem {
	id: string
	message: string
	type?: ToastType
}

interface ToastContextValue {
	showToast: (message: string, type?: ToastType) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
	const context = React.useContext(ToastContext)
	if (!context) {
		throw new Error("useToast must be used within ToastProvider")
	}
	return context
}

export function ToastProvider({children}: {children: React.ReactNode}) {
	const [toasts, setToasts] = React.useState<ToastItem[]>([])

	const showToast = React.useCallback(
		(message: string, type: ToastType = "success") => {
			const id = Math.random().toString(36).substring(2, 9)
			setToasts((prev) => [...prev, {id, message, type}])
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id))
			}, 2200)
		},
		[],
	)

	return (
		<ToastContext.Provider value={{showToast}}>
			{children}
			<div className="fixed bottom-3 right-3 left-3 z-50 flex flex-col items-center gap-1.5 pointer-events-none">
				{toasts.map((t) => (
					<div
						key={t.id}
						className={cn(
							"pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-xl border text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-full backdrop-blur-md",
							t.type === "success" &&
								"bg-(--p-surface) text-[#008060] dark:text-[#34d399] border-[#008060]/40 shadow-[#008060]/10",
							t.type === "error" &&
								"bg-(--p-surface) text-[#ef4444] dark:text-[#f87171] border-[#ef4444]/40 shadow-[#ef4444]/10",
							t.type === "info" &&
								"bg-(--p-surface) text-[#2563eb] dark:text-[#60a5fa] border-[#2563eb]/40 shadow-[#2563eb]/10",
						)}
					>
						{t.type === "success" && (
							<CheckIcon
								size={16}
								className="text-[#008060] dark:text-[#34d399] shrink-0"
							/>
						)}
						{t.type === "error" && (
							<AlertIcon
								size={16}
								className="text-[#ef4444] dark:text-[#f87171] shrink-0"
							/>
						)}
						{t.type === "info" && (
							<InfoIcon
								size={16}
								className="text-[#2563eb] dark:text-[#60a5fa] shrink-0"
							/>
						)}
						<span className="truncate text-(--p-text)">
							{t.message}
						</span>
						<button
							onClick={() =>
								setToasts((prev) =>
									prev.filter((item) => item.id !== t.id),
								)
							}
							className="ml-1 text-(--p-text-subdued) hover:text-(--p-text) p-0.5 cursor-pointer"
						>
							<CloseIcon size={14} />
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	)
}
