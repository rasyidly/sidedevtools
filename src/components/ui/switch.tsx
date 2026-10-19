import * as React from "react"
import {cn} from "@/lib/utils"

export interface SwitchProps extends Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"onChange"
> {
	checked?: boolean
	defaultChecked?: boolean
	onCheckedChange?: (checked: boolean) => void
	size?: "sm" | "default"
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
	(
		{
			className,
			checked: controlledChecked,
			defaultChecked = false,
			onCheckedChange,
			disabled,
			size = "default",
			onClick,
			...props
		},
		ref,
	) => {
		const isControlled = controlledChecked !== undefined
		const [uncontrolledChecked, setUncontrolledChecked] =
			React.useState(defaultChecked)
		const isChecked = isControlled ? controlledChecked : uncontrolledChecked

		const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
			if (disabled) return
			const nextChecked = !isChecked
			if (!isControlled) {
				setUncontrolledChecked(nextChecked)
			}
			onCheckedChange?.(nextChecked)
			onClick?.(e)
		}

		const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
			if (disabled) return
			if (e.key === " " || e.key === "Enter") {
				e.preventDefault()
				const nextChecked = !isChecked
				if (!isControlled) {
					setUncontrolledChecked(nextChecked)
				}
				onCheckedChange?.(nextChecked)
			}
		}

		return (
			<button
				type="button"
				role="switch"
				aria-checked={isChecked}
				disabled={disabled}
				ref={ref}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				className={cn(
					"inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008060]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-(--p-surface) disabled:cursor-not-allowed disabled:opacity-40 select-none",
					isChecked
						? "bg-[#008060]"
						: "bg-(--p-border) dark:bg-(--p-border) hover:bg-[#c4c7cc] dark:hover:bg-[#34363b]",
					size === "sm" ? "h-3.5 w-6" : "h-4 w-7",
					className,
				)}
				{...props}
			>
				<span
					className={cn(
						"pointer-events-none block rounded-full bg-white shadow-xs ring-0 transition-transform duration-200 ease-in-out",
						size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
						isChecked
							? size === "sm"
								? "translate-x-2.5"
								: "translate-x-3"
							: "translate-x-0",
					)}
				/>
			</button>
		)
	},
)

Switch.displayName = "Switch"
