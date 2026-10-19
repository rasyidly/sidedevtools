export interface StorageItem {
  key: string
  value: string
  sizeBytes: number
}

export interface CookieItem {
  name: string
  value: string
  domain: string
  path: string
  secure: boolean
  httpOnly: boolean
  sameSite: string
  expirationDate?: number
}

export interface TabStorageSnapshot {
  url: string
  origin: string
  localStorageItems: StorageItem[]
  sessionStorageItems: StorageItem[]
  cookies: CookieItem[]
  totalBytes: number
}

/**
 * Script injected into active tab to inspect & extract window.localStorage and window.sessionStorage
 */
export function getActiveTabStorageScript(): {
  localStorageItems: StorageItem[]
  sessionStorageItems: StorageItem[]
} {
  const localItems: StorageItem[] = []
  const sessionItems: StorageItem[] = []

  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key !== null) {
        const val = window.localStorage.getItem(key) || ''
        localItems.push({
          key,
          value: val,
          sizeBytes: (key.length + val.length) * 2, // UTF-16 approx
        })
      }
    }
  } catch (err) {
    console.error('Failed reading localStorage', err)
  }

  try {
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i)
      if (key !== null) {
        const val = window.sessionStorage.getItem(key) || ''
        sessionItems.push({
          key,
          value: val,
          sizeBytes: (key.length + val.length) * 2,
        })
      }
    }
  } catch (err) {
    console.error('Failed reading sessionStorage', err)
  }

  return {
    localStorageItems: localItems,
    sessionStorageItems: sessionItems,
  }
}

/**
 * Script injected to set or delete an item in active tab's storage
 */
export function updateActiveTabStorageScript(
  type: 'local' | 'session',
  action: 'set' | 'remove' | 'clear',
  key?: string,
  value?: string
): boolean {
  try {
    const store = type === 'local' ? window.localStorage : window.sessionStorage
    if (action === 'clear') {
      store.clear()
      return true
    }
    if (action === 'remove' && key) {
      store.removeItem(key)
      return true
    }
    if (action === 'set' && key) {
      store.setItem(key, value || '')
      return true
    }
    return false
  } catch (err) {
    console.error('Storage update failed', err)
    return false
  }
}

/**
 * Human-readable byte size formatter
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
