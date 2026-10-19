// @ts-expect-error onnxruntime-web typings are not mapped under exports
import * as ortStandard from "onnxruntime-web"
// @ts-expect-error onnxruntime-web typings are not mapped under exports
import * as ortWebGpu from "onnxruntime-web/webgpu"

/**
 * Patches ONNX Runtime's WebAssembly environment for Chrome Extensions (Manifest V3).
 *
 * Problem in MV3:
 * 1. @imgly/background-removal downloads .mjs wasm glue code into a Blob and sets
 *    ort.env.wasm.wasmPaths = { mjs: "blob:chrome-extension://...", wasm: "blob:chrome-extension://..." }
 * 2. ONNX Runtime attempts: await import("blob:chrome-extension://...")
 * 3. Chrome MV3 CSP strictly forbids dynamic module import() of blob: URLs, throwing:
 *    "TypeError: Failed to fetch dynamically imported module: blob:chrome-extension://..."
 *
 * Solution:
 * We intercept `env.wasm.wasmPaths` setter. Whenever @imgly sets wasmPaths with a blob .mjs URL,
 * we substitute it with the extension's local static .mjs file bundled in /onnxruntime-web/.
 * Chrome allows import("chrome-extension://<id>/onnxruntime-web/ort-wasm-simd-threaded.mjs")
 * because it is within the extension's own origin ('self').
 *
 * Furthermore, we lock numThreads = 1 and proxy = false because Chrome extension side panels
 * do not run with crossOriginIsolated headers, which prevents SharedArrayBuffer pthreads.
 */

function patchOrtEnv(env: any) {
	if (!env || !env.wasm) return

	// Lock numThreads to 1 to avoid web worker pthread crashes in non-crossOriginIsolated environment
	try {
		Object.defineProperty(env.wasm, "numThreads", {
			get() {
				return 1
			},
			set(_v: any) {
				// Prevent overwriting with multi-thread values
			},
			configurable: true,
			enumerable: true,
		})
	} catch {
		env.wasm.numThreads = 1
	}

	try {
		Object.defineProperty(env.wasm, "proxy", {
			get() {
				return false
			},
			set(_v: any) {},
			configurable: true,
			enumerable: true,
		})
	} catch {
		env.wasm.proxy = false
	}

	let currentWasmPaths: any = {}

	try {
		Object.defineProperty(env.wasm, "wasmPaths", {
			get() {
				return currentWasmPaths
			},
			set(val: any) {
				if (val && typeof val === "object") {
					const isWebGpu =
						typeof val.mjs === "string" && val.mjs.includes("jsep")
					const fileName = isWebGpu
						? "onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs"
						: "onnxruntime-web/ort-wasm-simd-threaded.mjs"

					// In Chrome extension, use chrome.runtime.getURL
					const localMjsUrl =
						typeof chrome !== "undefined" && chrome.runtime?.getURL
							? chrome.runtime.getURL(fileName)
							: fileName

					currentWasmPaths = {
						...val,
						mjs: localMjsUrl,
					}
				} else {
					currentWasmPaths = val
				}
			},
			configurable: true,
			enumerable: true,
		})
	} catch (e) {
		console.warn("Could not define wasmPaths property on env.wasm", e)
	}
}

let isInitialized = false

export function initializeOnnxRuntime() {
	if (isInitialized) return
	isInitialized = true

	try {
		if ((ortStandard as any)?.env) {
			patchOrtEnv((ortStandard as any).env)
		}
		if ((ortWebGpu as any)?.env) {
			patchOrtEnv((ortWebGpu as any).env)
		}
	} catch (err) {
		console.error("Failed to patch ONNX runtime environment:", err)
	}
}
