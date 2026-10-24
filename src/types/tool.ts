export type ToolCategory =
	| 'all'
	| 'converters'
	| 'generators'
	| 'formatters'
	| 'web'
	| 'design'
	| 'utilities'

export interface DevTool {
  id: string
  name: string
  shortName: string
  description: string
  category: Exclude<ToolCategory, 'all'>
  tags: string[]
  icon: string
  badge?: string
  isImplemented: boolean
  addedAt?: number
}
