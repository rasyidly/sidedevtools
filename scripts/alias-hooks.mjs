/**
 * Dev-only module resolution hook so `node scripts/verify-tools.mts` can import
 * the source files, which use the `@/` path alias from tsconfig.
 */

import {fileURLToPath} from "node:url"

const ROOT = new URL("../src/", import.meta.url)

export function resolve(specifier, context, nextResolve) {
	if (specifier.startsWith("@/")) {
		const path = specifier.slice(2)
		const hasExtension = /\.[a-z]+$/i.test(path)
		const url = new URL(hasExtension ? path : `${path}.ts`, ROOT).href
		// Fail early on a wrong guess instead of silently resolving elsewhere.
		try {
			fileURLToPath(url)
		} catch {
			return nextResolve(specifier, context)
		}
		return {url, shortCircuit: true}
	}
	return nextResolve(specifier, context)
}
