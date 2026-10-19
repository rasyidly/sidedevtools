import React, {useState, useEffect, useRef} from "react"
import {CloseIcon} from "@/components/ui/solar-icon"

interface ModalProps {
	isOpen: boolean
	onClose: () => void
	title?: React.ReactNode
	icon?: React.ReactNode
	children: React.ReactNode
	maxWidth?: string
	className?: string
}

export function Modal({
	isOpen,
	onClose,
	title,
	icon,
	children,
	maxWidth = "max-w-sm",
	className = "",
}: ModalProps) {
	const [shouldRender, setShouldRender] = useState(isOpen)
	const [isExiting, setIsExiting] = useState(false)
	const isMountedRef = useRef(false)

	useEffect(() => {
		// Avoid animating exit on initial mount when initially closed
		if (!isMountedRef.current) {
			isMountedRef.current = true
			if (!isOpen) return
		}

		let timer: ReturnType<typeof setTimeout> | undefined

		if (isOpen) {
			setIsExiting(false)
			setShouldRender(true)
		} else {
			setIsExiting(true)
			timer = setTimeout(() => {
				setIsExiting(false)
				setShouldRender(false)
			}, 140)
		}

		return () => {
			if (timer) clearTimeout(timer)
		}
	}, [isOpen])

	// Handle Escape key to dismiss
	useEffect(() => {
		if (!shouldRender || isExiting) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose()
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [shouldRender, isExiting, onClose])

	if (!shouldRender) return null

	return (
		<div
			onClick={(e) => {
				if (e.target === e.currentTarget && !isExiting) {
					onClose()
				}
			}}
			className={`fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 dark:bg-black/75 backdrop-blur-xs cursor-pointer ${
				isExiting
					? "animate-backdrop-out pointer-events-none"
					: "animate-backdrop-in"
			}`}
			role="dialog"
			aria-modal="true"
		>
			<div
				onClick={(e) => e.stopPropagation()}
				className={`cursor-default w-full ${maxWidth} rounded-lg border border-(--p-border) bg-(--p-surface) p-4 shadow-2xl flex flex-col gap-3 ${
					isExiting ? "animate-modal-pop-out" : "animate-modal-pop"
				} ${className}`}
			>
				{(title || icon) && (
					<div className="flex items-center justify-between pb-1">
						<div className="flex items-center gap-1.5 font-semibold text-xs text-(--p-text)">
							{icon}
							{typeof title === "string" ? (
								<span>{title}</span>
							) : (
								title
							)}
						</div>
						<button
							type="button"
							onClick={onClose}
							className="text-(--p-text-subdued) hover:text-(--p-text) p-0.5 rounded-md transition-colors cursor-pointer"
							title="Close (Esc)"
						>
							<CloseIcon size={14} />
						</button>
					</div>
				)}
				{children}
			</div>
		</div>
	)
}
