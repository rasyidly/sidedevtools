export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface ParsedHttpRequest {
  method: HttpMethod
  url: string
  headers: Record<string, string>
  body?: string
}

export type TargetLanguage =
  | 'curl'
  | 'fetch'
  | 'axios'
  | 'python-requests'
  | 'node-fetch'
  | 'golang'
  | 'rust'
  | 'php'

export const SAMPLE_CURL = `curl -X POST https://api.github.com/repos/rasyidly/sidedevtools/issues \\
  -H "Accept: application/vnd.github+json" \\
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Found a bug","body":"Having issues with storage inspection"}'`

export const SAMPLE_FETCH = `fetch('https://api.example.com/v1/users?status=active', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sample_token_123'
  },
  body: JSON.stringify({ name: 'Alex Rivera', role: 'developer' })
})`

export const SAMPLE_AXIOS = `axios.post('https://httpbin.org/post', {
  query: 'developer tools',
  theme: 'dark'
}, {
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Id': 'sidedevtools'
  }
})`

/**
 * Universal Parser that detects whether input is cURL, fetch(), axios, raw HTTP, or a simple URL.
 */
export function parseAnyHttpRequest(rawInput: string): ParsedHttpRequest {
  const input = rawInput.trim()
  if (!input) {
    return {
      method: 'GET',
      url: 'https://httpbin.org/get',
      headers: {},
    }
  }

  // 1. Check if it's cURL
  if (input.startsWith('curl') || input.includes('curl ')) {
    return parseCurl(input)
  }

  // 2. Check if it's axios
  if (input.includes('axios.') || input.includes('axios(')) {
    return parseAxios(input)
  }

  // 3. Check if it's fetch()
  if (input.includes('fetch(') || input.startsWith('fetch')) {
    return parseFetch(input)
  }

  // 4. Check if it's raw HTTP wire format (e.g. "POST /api HTTP/1.1\nHost: example.com")
  if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\S+\s+HTTP\//i.test(input)) {
    return parseRawHttp(input)
  }

  // 5. Fallback: maybe just a raw URL or URL with method? E.g. "https://api.org" or "POST https://..."
  const firstWordMatch = input.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(https?:\/\/\S+)/i)
  if (firstWordMatch) {
    return {
      method: firstWordMatch[1].toUpperCase() as HttpMethod,
      url: firstWordMatch[2],
      headers: {},
    }
  }

  if (input.startsWith('http://') || input.startsWith('https://')) {
    const url = input.split(/\s+/)[0]
    return {
      method: 'GET',
      url,
      headers: {},
    }
  }

  // Last ditch: treat the first line or entire text as URL
  try {
    const urlCandidate = input.split(/\s+/)[0]
    new URL(urlCandidate)
    return {
      method: 'GET',
      url: urlCandidate,
      headers: {},
    }
  } catch {
    // Return safe default with error payload
    return {
      method: 'GET',
      url: input.startsWith('/') ? `https://localhost${input}` : `https://${input.replace(/['";]/g, '').trim()}`,
      headers: {},
    }
  }
}

/**
 * Robust Bash-aware cURL command tokenizer and parser
 */
export function parseCurl(curlString: string): ParsedHttpRequest {
  // Normalize escaped newlines
  const cleaned = curlString
    .replace(/\\\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Tokenize taking quotes into account
  const tokens: string[] = []
  let currentToken = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let escape = false

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]

    if (escape) {
      currentToken += char
      escape = false
      continue
    }

    if (char === '\\') {
      escape = true
      continue
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (currentToken.length > 0) {
        tokens.push(currentToken)
        currentToken = ''
      }
      continue
    }

    currentToken += char
  }

  if (currentToken.length > 0) {
    tokens.push(currentToken)
  }

  let method: HttpMethod = 'GET'
  let url = ''
  const headers: Record<string, string> = {}
  let body: string | undefined

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token === 'curl') continue

    // Method flags: -X POST, --request POST
    if ((token === '-X' || token === '--request') && i + 1 < tokens.length) {
      method = tokens[++i].toUpperCase() as HttpMethod
      continue
    }

    // Header flags: -H "Key: Value", --header "Key: Value"
    if ((token === '-H' || token === '--header') && i + 1 < tokens.length) {
      const headerStr = tokens[++i]
      const colonIdx = headerStr.indexOf(':')
      if (colonIdx > 0) {
        const key = headerStr.substring(0, colonIdx).trim()
        const val = headerStr.substring(colonIdx + 1).trim()
        headers[key] = val
      }
      continue
    }

    // Data / Body flags: -d, --data, --data-raw, --data-binary, --data-urlencode
    if (
      (token === '-d' ||
        token === '--data' ||
        token === '--data-raw' ||
        token === '--data-binary' ||
        token === '--data-urlencode' ||
        token === '--json') &&
      i + 1 < tokens.length
    ) {
      body = tokens[++i]
      if (token === '--json' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }
      if (method === 'GET') {
        method = 'POST'
      }
      continue
    }

    // Basic Auth: -u user:pass
    if ((token === '-u' || token === '--user') && i + 1 < tokens.length) {
      const auth = tokens[++i]
      try {
        headers['Authorization'] = `Basic ${btoa(auth)}`
      } catch {
        headers['Authorization'] = `Basic ${auth}`
      }
      continue
    }

    // URL detection (non-flag token starting with http or not starting with -)
    if (!token.startsWith('-') && !url) {
      url = token.replace(/^['"]|['"]$/g, '')
    }
  }

  if (!url) {
    // Scan backwards if not caught
    for (const t of tokens) {
      if (t.startsWith('http://') || t.startsWith('https://')) {
        url = t
        break
      }
    }
  }

  return {
    method,
    url: url || 'https://httpbin.org/anything',
    headers,
    body,
  }
}

/**
 * Parse JavaScript fetch(...) code
 */
export function parseFetch(code: string): ParsedHttpRequest {
  let method: HttpMethod = 'GET'
  let url = ''
  const headers: Record<string, string> = {}
  let body: string | undefined

  // Extract URL from fetch('...') or fetch("...")
  const urlMatch = code.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/)
  if (urlMatch) {
    url = urlMatch[1]
  }

  // Extract method: 'POST'
  const methodMatch = code.match(/method\s*:\s*['"`]([A-Za-z]+)['"`]/i)
  if (methodMatch) {
    method = methodMatch[1].toUpperCase() as HttpMethod
  }

  // Extract headers
  const headersMatch = code.match(/headers\s*:\s*\{([^}]+)\}/s)
  if (headersMatch) {
    const rawHeaders = headersMatch[1]
    const headerLines = rawHeaders.split(/,\n|\n|,/).map((l) => l.trim()).filter(Boolean)
    for (const line of headerLines) {
      const match = line.match(/['"`]?([a-zA-Z0-9\-_]+)['"`]?\s*:\s*['"`]([^'"`]+)['"`]/)
      if (match) {
        headers[match[1]] = match[2]
      }
    }
  }

  // Extract body: JSON.stringify(...) or body: '...'
  const jsonBodyMatch = code.match(/body\s*:\s*JSON\.stringify\s*\(([\s\S]*?)\)/)
  if (jsonBodyMatch) {
    try {
      // Clean up js object notation to json if possible
      const rawObj = jsonBodyMatch[1].trim()
      body = rawObj
    } catch {
      body = jsonBodyMatch[1]
    }
  } else {
    const rawBodyMatch = code.match(/body\s*:\s*['"`]([\s\S]*?)['"`]/)
    if (rawBodyMatch) {
      body = rawBodyMatch[1]
    }
  }

  return {
    method,
    url: url || 'https://httpbin.org/anything',
    headers,
    body,
  }
}

/**
 * Parse Axios code: axios.post('url', body, { headers }) or axios({ url, method, data, headers })
 */
export function parseAxios(code: string): ParsedHttpRequest {
  let method: HttpMethod = 'GET'
  let url = ''
  const headers: Record<string, string> = {}
  let body: string | undefined

  // Match axios.get, axios.post, etc.
  const verbMatch = code.match(/axios\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/i)
  if (verbMatch) {
    method = verbMatch[1].toUpperCase() as HttpMethod
    url = verbMatch[2]

    // If POST/PUT/PATCH, second arg is data: axios.post(url, { ... }, { headers })
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const afterUrl = code.substring(code.indexOf(url) + url.length + 1)
      const dataMatch = afterUrl.match(/,\s*(\{[\s\S]*?\}|JSON\.stringify\([\s\S]*?\)|['"`][\s\S]*?['"`])/)
      if (dataMatch) {
        body = dataMatch[1].trim()
      }
    }
  } else {
    // Config object: axios({ url: '...', method: '...' })
    const urlMatch = code.match(/url\s*:\s*['"`]([^'"`]+)['"`]/)
    if (urlMatch) url = urlMatch[1]

    const methodMatch = code.match(/method\s*:\s*['"`]([A-Za-z]+)['"`]/i)
    if (methodMatch) method = methodMatch[1].toUpperCase() as HttpMethod

    const dataMatch = code.match(/data\s*:\s*(\{[\s\S]*?\}|['"`][\s\S]*?['"`])/)
    if (dataMatch) body = dataMatch[1].trim()
  }

  // Extract headers
  const headersMatch = code.match(/headers\s*:\s*\{([^}]+)\}/s)
  if (headersMatch) {
    const rawHeaders = headersMatch[1]
    const headerLines = rawHeaders.split(/,\n|\n|,/).map((l) => l.trim()).filter(Boolean)
    for (const line of headerLines) {
      const match = line.match(/['"`]?([a-zA-Z0-9\-_]+)['"`]?\s*:\s*['"`]([^'"`]+)['"`]/)
      if (match) {
        headers[match[1]] = match[2]
      }
    }
  }

  return {
    method,
    url: url || 'https://httpbin.org/anything',
    headers,
    body,
  }
}

/**
 * Parse raw HTTP wire format
 */
export function parseRawHttp(raw: string): ParsedHttpRequest {
  const lines = raw.split(/\r?\n/)
  const firstLine = lines[0].trim()
  const parts = firstLine.split(/\s+/)
  const method = (parts[0] || 'GET').toUpperCase() as HttpMethod
  let path = parts[1] || '/'

  const headers: Record<string, string> = {}
  let i = 1
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') {
      i++
      break
    }
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      headers[line.substring(0, colonIdx).trim()] = line.substring(colonIdx + 1).trim()
    }
  }

  const host = headers['Host'] || 'localhost'
  const url = path.startsWith('http') ? path : `https://${host}${path}`
  const body = lines.slice(i).join('\n').trim() || undefined

  return {
    method,
    url,
    headers,
    body,
  }
}

/**
 * Formatters / Code Generators into Target Languages
 */

export function toCurl(req: ParsedHttpRequest): string {
  const parts: string[] = ['curl -X', req.method, `"${req.url}"`]

  for (const [key, value] of Object.entries(req.headers)) {
    parts.push(`  -H "${key}: ${value.replace(/"/g, '\\"')}"`)
  }

  if (req.body) {
    parts.push(`  -d '${req.body.replace(/'/g, "'\\''")}'`)
  }

  return parts.join(' \\\n')
}

export function toFetch(req: ParsedHttpRequest): string {
  const hasHeaders = Object.keys(req.headers).length > 0
  const hasBody = Boolean(req.body)

  const options: string[] = []
  if (req.method !== 'GET') {
    options.push(`  method: '${req.method}',`)
  }

  if (hasHeaders) {
    const headersStr = Object.entries(req.headers)
      .map(([k, v]) => `    '${k}': '${v.replace(/'/g, "\\'")}'`)
      .join(',\n')
    options.push(`  headers: {\n${headersStr}\n  },`)
  }

  if (hasBody) {
    // If it looks like valid JSON
    let bodyFormatted = req.body!
    try {
      const parsed = JSON.parse(req.body!)
      bodyFormatted = `JSON.stringify(${JSON.stringify(parsed, null, 2).replace(/\n/g, '\n  ')})`
    } catch {
      bodyFormatted = JSON.stringify(req.body)
    }
    options.push(`  body: ${bodyFormatted}`)
  }

  if (options.length === 0) {
    return `const response = await fetch('${req.url}');\nconst data = await response.json();`
  }

  return `const response = await fetch('${req.url}', {\n${options.join('\n')}\n});\nconst data = await response.json();`
}

export function toAxios(req: ParsedHttpRequest): string {
  const hasHeaders = Object.keys(req.headers).length > 0
  const hasBody = Boolean(req.body)
  const methodLower = req.method.toLowerCase()

  const configParts: string[] = []
  if (hasHeaders) {
    const headersStr = Object.entries(req.headers)
      .map(([k, v]) => `      '${k}': '${v.replace(/'/g, "\\'")}'`)
      .join(',\n')
    configParts.push(`  headers: {\n${headersStr}\n  }`)
  }

  if (['post', 'put', 'patch'].includes(methodLower)) {
    let bodyFormatted = req.body || '{}'
    try {
      const parsed = JSON.parse(req.body || '{}')
      bodyFormatted = JSON.stringify(parsed, null, 2)
    } catch {
      bodyFormatted = JSON.stringify(req.body || '')
    }

    if (configParts.length > 0) {
      return `import axios from 'axios';\n\nconst { data } = await axios.${methodLower}('${req.url}', ${bodyFormatted}, {\n${configParts.join(',\n')}\n});`
    }
    return `import axios from 'axios';\n\nconst { data } = await axios.${methodLower}('${req.url}', ${bodyFormatted});`
  }

  if (configParts.length > 0) {
    return `import axios from 'axios';\n\nconst { data } = await axios.${methodLower}('${req.url}', {\n${configParts.join(',\n')}\n});`
  }

  return `import axios from 'axios';\n\nconst { data } = await axios.${methodLower}('${req.url}');`
}

export function toPythonRequests(req: ParsedHttpRequest): string {
  const lines: string[] = ['import requests', '']
  const methodLower = req.method.toLowerCase()

  const hasHeaders = Object.keys(req.headers).length > 0
  if (hasHeaders) {
    lines.push('headers = {')
    for (const [k, v] of Object.entries(req.headers)) {
      lines.push(`    "${k}": "${v.replace(/"/g, '\\"')}",`)
    }
    lines.push('}')
    lines.push('')
  }

  let payloadVar = ''
  if (req.body) {
    try {
      JSON.parse(req.body)
      lines.push(`payload = ${req.body}`)
      payloadVar = ', json=payload'
    } catch {
      lines.push(`payload = """${req.body.replace(/"""/g, '\\"""')}"""`)
      payloadVar = ', data=payload'
    }
    lines.push('')
  }

  const headersParam = hasHeaders ? ', headers=headers' : ''
  lines.push(`response = requests.${methodLower}("${req.url}"${headersParam}${payloadVar})`)
  lines.push('print(response.status_code)')
  lines.push('print(response.json())')

  return lines.join('\n')
}

export function toGolang(req: ParsedHttpRequest): string {
  const hasBody = Boolean(req.body)

  return `package main

import (
	"fmt"
	"io"
	"net/http"
${hasBody ? '\t"strings"\n' : ''})

func main() {
	client := &http.Client{}
${
  hasBody
    ? `\tbody := strings.NewReader(${JSON.stringify(req.body)})\n\treq, err := http.NewRequest("${req.method}", "${req.url}", body)`
    : `\treq, err := http.NewRequest("${req.method}", "${req.url}", nil)`
}
	if err != nil {
		panic(err)
	}

${Object.entries(req.headers)
  .map(([k, v]) => `\treq.Header.Set("${k}", "${v}")`)
  .join('\n')}

	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Println(string(respBody))
}`
}

export function toRustReqwest(req: ParsedHttpRequest): string {
  const hasBody = Boolean(req.body)
  const method = req.method.toUpperCase()

  return `use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use std::str::FromStr;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    let mut headers = HeaderMap::new();
${Object.entries(req.headers)
  .map(
    ([k, v]) =>
      `    headers.insert(HeaderName::from_str("${k}")?, HeaderValue::from_str("${v.replace(/"/g, '\\"')}")?);`
  )
  .join('\n')}

    let response = client
        .${method.toLowerCase()}("${req.url}")
        .headers(headers)
${hasBody ? `        .body(${JSON.stringify(req.body)})\n` : ''}        .send()
        .await?;

    println!("Status: {}", response.status());
    let body = response.text().await?;
    println!("Body: {}", body);

    Ok(())
}`
}

export function toPhpCurl(req: ParsedHttpRequest): string {
  return `<?php

$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, '${req.url}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${req.method}');
${
  Object.keys(req.headers).length > 0
    ? `curl_setopt($ch, CURLOPT_HTTPHEADER, [\n${Object.entries(req.headers)
        .map(([k, v]) => `    '${k}: ${v.replace(/'/g, "\\'")}',`)
        .join('\n')}\n]);\n`
    : ''
}${
    req.body
      ? `curl_setopt($ch, CURLOPT_POSTFIELDS, ${JSON.stringify(req.body)});\n`
      : ''
  }
$response = curl_exec($ch);
curl_close($ch);

echo $response;`
}

export function convertRequest(req: ParsedHttpRequest, target: TargetLanguage): string {
  switch (target) {
    case 'curl':
      return toCurl(req)
    case 'fetch':
      return toFetch(req)
    case 'axios':
      return toAxios(req)
    case 'python-requests':
      return toPythonRequests(req)
    case 'golang':
      return toGolang(req)
    case 'rust':
      return toRustReqwest(req)
    case 'php':
      return toPhpCurl(req)
    default:
      return toFetch(req)
  }
}
