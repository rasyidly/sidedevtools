import React from "react"
import {
	MagniferOutline,
	CloseSquareOutline,
	StarBoldDuotone,
	HistoryBoldDuotone,
	AltArrowRightOutline,
	AltArrowDownOutline,
	AltArrowLeftOutline,
	CopyLineDuotone,
	CheckCircleOutline,
	DangerTriangleBoldDuotone,
	InfoCircleBoldDuotone,
	TrashBinTrashBoldDuotone,
	EyeBoldDuotone,
	EyeClosedBoldDuotone,
	LockKeyholeBoldDuotone,
	KeyMinimalisticBoldDuotone,
	StarsBoldDuotone,
	RestartBoldDuotone,
	BookmarkBoldDuotone,
	DownloadSquareBoldDuotone,
	UploadSquareBoldDuotone,
	Sun2BoldDuotone,
	MoonStarsBoldDuotone,
	QuestionCircleBoldDuotone,
	SidebarCodeBoldDuotone,
	CodeSquareBoldDuotone,
	Scanner2BoldDuotone,
	FileTextBoldDuotone,
	ShieldCheckBoldDuotone,
	PaletteBoldDuotone,
	ChatSquareCodeBoldDuotone,
	FilterBoldDuotone,
	AddCircleBoldDuotone,
	TransferHorizontalBoldDuotone,
	MaximizeSquareBoldDuotone,
	MinimizeSquareBoldDuotone,
	QRCodeBoldDuotone,
	EraserBoldDuotone,
	ScreenShareBoldDuotone,
	ClipboardTextBoldDuotone,
	GalleryBoldDuotone,
	SafeSquareBoldDuotone,
	CalendarDateBoldDuotone,
	DocumentTextBoldDuotone,
	HeartBoldDuotone,
	WalletBoldDuotone,
	GlobalBoldDuotone,
	ShareCircleBoldDuotone,
	ArchiveDownBoldDuotone,
	SortByAlphabetBoldDuotone,
	SortByTimeBoldDuotone,
	DatabaseBoldDuotone,
	Routing2BoldDuotone,
} from "solar-icon-set"

export {
	MagniferOutline as SearchIcon,
	CloseSquareOutline as CloseIcon,
	StarBoldDuotone as StarIcon,
	HistoryBoldDuotone as HistoryIcon,
	AltArrowRightOutline as ChevronRightIcon,
	AltArrowDownOutline as ChevronDownIcon,
	AltArrowLeftOutline as ArrowLeftIcon,
	CopyLineDuotone as CopyIcon,
	CheckCircleOutline as CheckIcon,
	DangerTriangleBoldDuotone as AlertIcon,
	InfoCircleBoldDuotone as InfoIcon,
	TrashBinTrashBoldDuotone as TrashIcon,
	EyeBoldDuotone as EyeIcon,
	EyeClosedBoldDuotone as EyeOffIcon,
	LockKeyholeBoldDuotone as LockIcon,
	KeyMinimalisticBoldDuotone as KeyIcon,
	StarsBoldDuotone as SparklesIcon,
	RestartBoldDuotone as RefreshIcon,
	BookmarkBoldDuotone as BookmarkIcon,
	DownloadSquareBoldDuotone as DownloadIcon,
	UploadSquareBoldDuotone as UploadIcon,
	Sun2BoldDuotone as SunIcon,
	MoonStarsBoldDuotone as MoonIcon,
	QuestionCircleBoldDuotone as HelpIcon,
	SidebarCodeBoldDuotone as TerminalIcon,
	CodeSquareBoldDuotone as CodeIcon,
	Scanner2BoldDuotone as FingerprintIcon,
	FileTextBoldDuotone as JsonIcon,
	ShieldCheckBoldDuotone as ShieldIcon,
	PaletteBoldDuotone as PaletteIcon,
	ChatSquareCodeBoldDuotone as RegexIcon,
	FilterBoldDuotone as FilterIcon,
	AddCircleBoldDuotone as PlusIcon,
	TransferHorizontalBoldDuotone as SwapIcon,
	MaximizeSquareBoldDuotone as MaximizeIcon,
	MinimizeSquareBoldDuotone as MinimizeIcon,
	QRCodeBoldDuotone as QrCodeIcon,
	EraserBoldDuotone as EraserIcon,
	ScreenShareBoldDuotone as ScreenShareIcon,
	ClipboardTextBoldDuotone as ClipboardIcon,
	GalleryBoldDuotone as ImageIcon,
	SafeSquareBoldDuotone as VaultIcon,
	CalendarDateBoldDuotone as CalendarIcon,
	DocumentTextBoldDuotone as DocumentIcon,
	HeartBoldDuotone as HeartIcon,
	WalletBoldDuotone as WalletIcon,
	GlobalBoldDuotone as GlobeIcon,
	ShareCircleBoldDuotone as ShareIcon,
	ArchiveDownBoldDuotone as ArchiveIcon,
	SortByAlphabetBoldDuotone as SortAlphabetIcon,
	SortByTimeBoldDuotone as SortTimeIcon,
	DatabaseBoldDuotone as DatabaseIcon,
	Routing2BoldDuotone as RoutingIcon,
}

const solarIconRegistry: Record<string, React.ComponentType<any>> = {
	// Aliases for tools registry
	Globe: GlobalBoldDuotone,
	Global: GlobalBoldDuotone,
	Share: ShareCircleBoldDuotone,
	Archive: ArchiveDownBoldDuotone,
	SortAlphabet: SortByAlphabetBoldDuotone,
	SortTime: SortByTimeBoldDuotone,
	Database: DatabaseBoldDuotone,
	Storage: DatabaseBoldDuotone,
	Server: DatabaseBoldDuotone,
	Routing: Routing2BoldDuotone,
	Http: Routing2BoldDuotone,
	Network: Routing2BoldDuotone,
	Favicon: GalleryBoldDuotone,
	KeyRound: KeyMinimalisticBoldDuotone,
	Key: KeyMinimalisticBoldDuotone,
	Binary: CodeSquareBoldDuotone,
	Fingerprint: Scanner2BoldDuotone,
	FileJson: FileTextBoldDuotone,
	ShieldCheck: ShieldCheckBoldDuotone,
	Palette: PaletteBoldDuotone,
	Calendar: CalendarDateBoldDuotone,
	CalendarDate: CalendarDateBoldDuotone,
	Document: DocumentTextBoldDuotone,
	DocumentText: DocumentTextBoldDuotone,
	FileText: DocumentTextBoldDuotone,
	Regex: ChatSquareCodeBoldDuotone,
	Terminal: SidebarCodeBoldDuotone,
	Search: MagniferOutline,
	Star: StarBoldDuotone,
	Clock: HistoryBoldDuotone,
	ChevronRight: AltArrowRightOutline,
	ChevronDown: AltArrowDownOutline,
	ArrowLeft: AltArrowLeftOutline,
	Copy: CopyLineDuotone,
	Check: CheckCircleOutline,
	Trash: TrashBinTrashBoldDuotone,
	Eye: EyeBoldDuotone,
	EyeOff: EyeClosedBoldDuotone,
	Lock: LockKeyholeBoldDuotone,
	Sparkles: StarsBoldDuotone,
	Download: DownloadSquareBoldDuotone,
	Upload: UploadSquareBoldDuotone,
	Sun: Sun2BoldDuotone,
	Moon: MoonStarsBoldDuotone,
	Help: QuestionCircleBoldDuotone,
	QrCode: QRCodeBoldDuotone,
	Totp: QRCodeBoldDuotone,
	Eraser: EraserBoldDuotone,
	Image: GalleryBoldDuotone,
	ScreenShare: ScreenShareBoldDuotone,
	Clipboard: ClipboardTextBoldDuotone,
}

export interface SolarIconProps {
	name: string
	size?: number
	className?: string
	color?: string
	style?: React.CSSProperties
}

export function SolarIcon({
	name,
	size = 16,
	className,
	color = "currentColor",
	style,
}: SolarIconProps) {
	const IconComponent = solarIconRegistry[name] || SidebarCodeBoldDuotone
	return (
		<IconComponent
			size={size}
			className={className}
			color={color}
			style={style}
		/>
	)
}

// Backward-compatible ToolIcon component
export function ToolIcon({
	name,
	size = 16,
	className,
	style,
}: {
	name: string
	size?: number
	className?: string
	style?: React.CSSProperties
}) {
	return (
		<SolarIcon
			name={name}
			size={size}
			className={className}
			style={style}
		/>
	)
}
