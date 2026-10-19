export interface PasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeAmbiguous: boolean
  excludeSimilar: boolean
}

export interface PasswordStrength {
  score: number // 0 to 4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong'
  entropy: number
  crackTime: string
  color: string // Polaris tone color
}

export interface SavedPassword {
  id: string
  label: string
  password: string
  notes?: string
  createdAt: number
  strength: 'Weak' | 'Fair' | 'Strong' | 'Very Strong'
}

const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz'
const NUMBER_CHARS = '0123456789'
const SYMBOL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

// Characters that look alike (0, O, o, 1, l, I)
const SIMILAR_CHARS = /[0Oo1lI]/g
// Ambiguous symbols ({}, [], (), /\', "~,;.<>)
const AMBIGUOUS_CHARS = /[{}[\]()/\\'"`~,;:.<>]/g

export function generatePassword(options: PasswordOptions): string {
  let charPool = ''
  const requiredChars: string[] = []

  let upper = UPPERCASE_CHARS
  let lower = LOWERCASE_CHARS
  let nums = NUMBER_CHARS
  let syms = SYMBOL_CHARS

  if (options.excludeSimilar) {
    upper = upper.replace(SIMILAR_CHARS, '')
    lower = lower.replace(SIMILAR_CHARS, '')
    nums = nums.replace(SIMILAR_CHARS, '')
  }

  if (options.excludeAmbiguous) {
    syms = syms.replace(AMBIGUOUS_CHARS, '')
  }

  if (options.uppercase) {
    charPool += upper
    requiredChars.push(getRandomChar(upper))
  }
  if (options.lowercase) {
    charPool += lower
    requiredChars.push(getRandomChar(lower))
  }
  if (options.numbers) {
    charPool += nums
    requiredChars.push(getRandomChar(nums))
  }
  if (options.symbols) {
    charPool += syms
    requiredChars.push(getRandomChar(syms))
  }

  if (!charPool) {
    return ''
  }

  const passwordChars: string[] = [...requiredChars]
  const remaining = Math.max(0, options.length - requiredChars.length)

  for (let i = 0; i < remaining; i++) {
    passwordChars.push(getRandomChar(charPool))
  }

  // Cryptographically shuffle array (Fisher-Yates)
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1)
    const temp = passwordChars[i]
    passwordChars[i] = passwordChars[j]
    passwordChars[j] = temp
  }

  return passwordChars.slice(0, options.length).join('')
}

function getRandomChar(str: string): string {
  const index = getRandomInt(str.length)
  return str[index]
}

function getRandomInt(max: number): number {
  const randomBuffer = new Uint32Array(1)
  window.crypto.getRandomValues(randomBuffer)
  return randomBuffer[0] % max
}

export function calculateStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Very Weak',
      entropy: 0,
      crackTime: 'Instant',
      color: 'bg-rose-500',
    }
  }

  let poolSize = 0
  if (/[a-z]/.test(password)) poolSize += 26
  if (/[A-Z]/.test(password)) poolSize += 26
  if (/[0-9]/.test(password)) poolSize += 10
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33

  if (poolSize === 0) poolSize = 1

  const entropy = Math.round(password.length * Math.log2(poolSize))

  let score = 0
  let label: PasswordStrength['label'] = 'Very Weak'
  let color = 'bg-rose-500'
  let crackTime = 'Instant'

  if (entropy < 36) {
    score = 1
    label = 'Very Weak'
    color = 'bg-rose-500'
    crackTime = '< 1 second'
  } else if (entropy < 60) {
    score = 2
    label = 'Weak'
    color = 'bg-amber-500'
    crackTime = 'A few minutes'
  } else if (entropy < 80) {
    score = 3
    label = 'Fair'
    color = 'bg-yellow-400'
    crackTime = 'Months'
  } else if (entropy < 100) {
    score = 4
    label = 'Strong'
    color = 'bg-teal-400'
    crackTime = 'Centuries'
  } else {
    score = 5
    label = 'Very Strong'
    color = 'bg-emerald-500'
    crackTime = 'Billions of years'
  }

  return { score, label, entropy, crackTime, color }
}
