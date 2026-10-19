import * as React from "react"
import {cn} from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?:
		| "default"
		| "secondary"
		| "outline"
		| "ghost"
		| "destructive"
		| "subtle"
	size?: "xs" | "sm" | "default" | "icon-xs" | "icon-sm"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({className, variant = "default", size = "xs", ...props}, ref) => {
		return (
			<button
				ref={ref}
				className={cn(
					"inline-flex items-center justify-center font-medium rounded-lg transition-all duration-100 cursor-pointer disabled:opacity-40 disabled:pointer-events-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008060]/70 active:scale-[0.98] tabular-nums",
					{
						// Polaris Button Variants
						"bg-[#008060] text-white hover:bg-[#006e52] active:bg-[#005e46] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.15)] border border-[#005e46]":
							variant === "default",
						"bg-(--p-surface) text-(--p-text) hover:bg-(--p-surface-hover) active:bg-(--p-surface-selected) border border-(--p-border) shadow-[0_1px_1px_rgba(0,0,0,0.06)]":
							variant === "secondary",
						"border border-(--p-border) bg-transparent text-(--p-text) hover:bg-(--p-surface-hover)":
							variant === "outline",
						"bg-transparent text-(--p-text-subdued) hover:text-(--p-text) hover:bg-(--p-surface-hover)":
							variant === "ghost",
						"bg-[#2d1518] text-[#f87171] border border-[#522327] hover:bg-[#3a191d] dark:bg-[#2d1518] dark:text-[#f87171]":
							variant === "destructive",
						"bg-[#0d221a] text-[#34d399] border border-[#144733] hover:bg-[#122e23]":
							variant === "subtle",

						// Compact Polaris Sizing with consistent rounded-lg
						"h-6 px-2 text-[11px] gap-1": size === "xs",
						"h-7 px-2.5 text-xs gap-1.5": size === "sm",
						"h-8 px-3 text-xs gap-2": size === "default",
						"h-6 w-6 text-xs p-0": size === "icon-xs",
						"h-7 w-7 text-xs p-0": size === "icon-sm",
					},
					className,
				)}
				{...props}
			/>
		)
	},
)
Button.displayName = "Button"
