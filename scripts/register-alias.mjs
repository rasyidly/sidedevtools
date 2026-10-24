import {register, registerHooks} from "node:module"
import * as hooks from "./alias-hooks.mjs"

// `register()` is the portable API; `registerHooks()` avoids its deprecation
// warning on newer Node versions.
if (typeof registerHooks === "function") {
	registerHooks({resolve: hooks.resolve})
} else {
	register("./alias-hooks.mjs", import.meta.url)
}
