import * as React from "react"
import {cn} from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?:
		| "default"
		| "secondary"
		| "outline"
		| "success"
		| "info"
		| "attention"
		| "critical"
}

export function Badge({className, variant = "default", ...props}: BadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center px-1.5 py-0.5 rounded-lg text-[10px] font-medium tracking-tight select-none border transition-colors tabular-nums",
				{
					"bg-(--p-surface-hover) text-(--p-text) border-(--p-border)":
						variant === "default",
					"bg-(--p-surface-subdued) text-(--p-text-subdued) border-(--p-border-subtle)":
						variant === "secondary",
					"border-(--p-border) text-(--p-text) bg-transparent":
						variant === "outline",
					"bg-[#e3f1df] text-[#1a5d38] border-[#b4dbab] dark:bg-[#0d2219] dark:text-[#34d399] dark:border-[#144732]":
						variant === "success",
					"bg-[#e8f1fc] text-[#1d5bbf] border-[#b9d5f7] dark:bg-[#0f2138] dark:text-[#60a5fa] dark:border-[#1a385f]":
						variant === "info",
					"bg-[#fff4d6] text-[#8a6100] border-[#ffe08a] dark:bg-[#281d0c] dark:text-[#fbbf24] dark:border-[#473414]":
						variant === "attention",
					"bg-[#fde8e8] text-[#bc2222] border-[#f8b4b4] dark:bg-[#2d1518] dark:text-[#f87171] dark:border-[#522327]":
						variant === "critical",
				},
				className,
			)}
			{...props}
		/>
	)
}
