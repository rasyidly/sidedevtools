import * as React from "react"
import {cn} from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	compact?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({className, type = "text", compact = true, ...props}, ref) => {
		return (
			<input
				type={type}
				ref={ref}
				className={cn(
					"w-full rounded-lg border border-(--p-border) bg-(--p-surface) px-2.5 text-(--p-text) placeholder:text-(--p-text-subdued) shadow-[inset_0_1px_1px_rgba(0,0,0,0.06)] transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]",
					compact ? "h-7 text-xs" : "h-8 text-xs",
					className,
				)}
				{...props}
			/>
		)
	},
)
Input.displayName = "Input"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({className, ...props}, ref) => {
		return (
			<textarea
				ref={ref}
				className={cn(
					"w-full rounded-xl border border-(--p-border) bg-(--p-surface) p-2 text-xs text-(--p-text) placeholder:text-(--p-text-subdued) shadow-[inset_0_1px_1px_rgba(0,0,0,0.06)] transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060] resize-y leading-relaxed",
					className,
				)}
				{...props}
			/>
		)
	},
)
Textarea.displayName = "Textarea"
