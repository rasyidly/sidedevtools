// UTF-8 safe Base64 encoder and decoder
export function utf8ToBase64(str: string, urlSafe = false): string {
  try {
    const bytes = new TextEncoder().encode(str)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    let base64 = btoa(binary)
    if (urlSafe) {
      base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }
    return base64
  } catch (err: any) {
    throw new Error('Failed to encode Base64: ' + err.message)
  }
}

export function base64ToUtf8(base64: string): string {
  try {
    let clean = base64.trim()
    // Handle URL safe base64
    clean = clean.replace(/-/g, '+').replace(/_/g, '/')
    while (clean.length % 4) {
      clean += '='
    }
    const binary = atob(clean)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch (err: any) {
    throw new Error('Invalid Base64 format: ' + err.message)
  }
}

export function encodeHtmlEntities(str: string): string {
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#039;'
      default: return m
    }
  })
}

export function decodeHtmlEntities(str: string): string {
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

export function textToHex(str: string, separator = ' '): string {
  const bytes = new TextEncoder().encode(str)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(separator)
}

export function hexToText(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '')
  if (clean.length % 2 !== 0) {
    throw new Error('Hex string length must be an even number')
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16)
  }
  return new TextDecoder().decode(bytes)
}

export interface DecodedJWT {
  header: any
  payload: any
  signature: string
  isExpired?: boolean
  expiresAt?: string
  issuedAt?: string
  validUntil?: string
}

export function decodeJWT(token: string): DecodedJWT {
  const parts = token.trim().split('.')
  if (parts.length !== 3) {
    throw new Error('JWT must contain 3 dot-separated parts (header.payload.signature)')
  }

  const decodePart = (part: string) => {
    const jsonStr = base64ToUtf8(part)
    return JSON.parse(jsonStr)
  }

  const header = decodePart(parts[0])
  const payload = decodePart(parts[1])
  const signature = parts[2]

  let isExpired: boolean | undefined
  let expiresAt: string | undefined
  let issuedAt: string | undefined

  if (payload.exp && typeof payload.exp === 'number') {
    const expDate = new Date(payload.exp * 1000)
    isExpired = Date.now() > expDate.getTime()
    expiresAt = expDate.toLocaleString()
  }

  if (payload.iat && typeof payload.iat === 'number') {
    issuedAt = new Date(payload.iat * 1000).toLocaleString()
  }

  return {
    header,
    payload,
    signature,
    isExpired,
    expiresAt,
    issuedAt,
  }
}
