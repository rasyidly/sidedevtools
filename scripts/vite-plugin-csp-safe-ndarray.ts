import {readFileSync} from "node:fs"
import {resolve} from "node:path"
import type {Plugin} from "vite"

const SAFE_NDARRAY_PATH = resolve(
	import.meta.dirname,
	"csp-safe-ndarray.js",
)

/**
 * Replaces the eval-based ndarray implementation that @imgly/background-removal
 * bundles inside its ESM entry with a CSP-safe equivalent.
 *
 * Chrome MV3 extension pages cannot use `'unsafe-eval'`, so the upstream
 * `new Function(...)` constructor generation throws:
 * "EvalError: Evaluating a string as JavaScript violates the following Content
 * Security Policy directive...". Since ndarray is already inlined in the
 * dependency's dist file, aliasing the package is not enough; the bundle text
 * has to be rewritten at build time.
 */
export function cspSafeNdarray(): Plugin {
	const safeBlock = readFileSync(SAFE_NDARRAY_PATH, "utf8")

	return {
		name: "csp-safe-ndarray",
		enforce: "pre",
		transform(code, id) {
			const normalizedId = id.replaceAll("\\", "/").split("?")[0]
			if (
				!normalizedId.includes("@imgly/background-removal") ||
				!normalizedId.endsWith("/dist/index.mjs")
			) {
				return null
			}

			const start = code.indexOf("var require_ndarray = __commonJS({")
			const exportMarker = "module.exports = wrappedNDArrayCtor;"
			const exportIndex = code.indexOf(exportMarker, start)
			const closeIndex = code.indexOf("\n});", exportIndex)

			if (start === -1 || exportIndex === -1 || closeIndex === -1) {
				this.error(
					"Could not locate the bundled ndarray module in " +
						"@imgly/background-removal. The CSP-safe patch needs updating.",
				)
			}

			const end = closeIndex + "\n});".length
			return {
				code: code.slice(0, start) + safeBlock + code.slice(end),
				map: null,
			}
		},
	}
}
