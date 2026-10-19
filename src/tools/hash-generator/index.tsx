import {useState, useEffect} from "react"
import {CopyIcon, CheckIcon} from "@/components/ui/solar-icon"
import {Textarea} from "@/components/ui/input"
import {useToast} from "@/components/ui/toast"

// Simple MD5 implementation for client-side quick hash
function md5(input: string): string {
	function safeAdd(x: number, y: number) {
		const lsw = (x & 0xffff) + (y & 0xffff)
		const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
		return (msw << 16) | (lsw & 0xffff)
	}
	function bitRol(num: number, cnt: number) {
		return (num << cnt) | (num >>> (32 - cnt))
	}
	function md5cmn(
		q: number,
		a: number,
		b: number,
		x: number,
		s: number,
		t: number,
	) {
		return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
	}
	function md5ff(
		a: number,
		b: number,
		c: number,
		d: number,
		x: number,
		s: number,
		t: number,
	) {
		return md5cmn((b & c) | (~b & d), a, b, x, s, t)
	}
	function md5gg(
		a: number,
		b: number,
		c: number,
		d: number,
		x: number,
		s: number,
		t: number,
	) {
		return md5cmn((b & d) | (c & ~d), a, b, x, s, t)
	}
	function md5hh(
		a: number,
		b: number,
		c: number,
		d: number,
		x: number,
		s: number,
		t: number,
	) {
		return md5cmn(b ^ c ^ d, a, b, x, s, t)
	}
	function md5ii(
		a: number,
		b: number,
		c: number,
		d: number,
		x: number,
		s: number,
		t: number,
	) {
		return md5cmn(c ^ (b | ~d), a, b, x, s, t)
	}

	function binlMD5(x: number[], len: number) {
		x[len >> 5] |= 0x80 << (len % 32)
		x[(((len + 64) >>> 9) << 4) + 14] = len
		let a = 1732584193,
			b = -271733879,
			c = -1732584194,
			d = 271733878

		for (let i = 0; i < x.length; i += 16) {
			const olda = a,
				oldb = b,
				oldc = c,
				oldd = d
			a = md5ff(a, b, c, d, x[i], 7, -680876936)
			d = md5ff(d, a, b, c, x[i + 1], 12, -389564586)
			c = md5ff(c, d, a, b, x[i + 2], 17, 606105819)
			b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330)
			a = md5ff(a, b, c, d, x[i + 4], 7, -176418897)
			d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426)
			c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341)
			b = md5ff(b, c, d, a, x[i + 7], 22, -45705983)
			a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416)
			d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417)
			c = md5ff(c, d, a, b, x[i + 10], 17, -42063)
			b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162)
			a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682)
			d = md5ff(d, a, b, c, x[i + 13], 12, -40341101)
			c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290)
			b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329)

			a = md5gg(a, b, c, d, x[i + 1], 5, -165796510)
			d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632)
			c = md5gg(c, d, a, b, x[i + 11], 14, 643717713)
			b = md5gg(b, c, d, a, x[i], 20, -373897302)
			a = md5gg(a, b, c, d, x[i + 5], 5, -701558691)
			d = md5gg(d, a, b, c, x[i + 10], 9, 38016083)
			c = md5gg(c, d, a, b, x[i + 15], 14, -660478335)
			b = md5gg(b, c, d, a, x[i + 4], 20, -405537848)
			a = md5gg(a, b, c, d, x[i + 9], 5, 568446438)
			d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690)
			c = md5gg(c, d, a, b, x[i + 3], 14, -187363961)
			b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501)
			a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467)
			d = md5gg(d, a, b, c, x[i + 2], 9, -51403784)
			c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473)
			b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734)

			a = md5hh(a, b, c, d, x[i + 5], 4, -378558)
			d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463)
			c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562)
			b = md5hh(b, c, d, a, x[i + 14], 23, -35309556)
			a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060)
			d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353)
			c = md5hh(c, d, a, b, x[i + 7], 16, -155497632)
			b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640)
			a = md5hh(a, b, c, d, x[i + 13], 4, 681279174)
			d = md5hh(d, a, b, c, x[i], 11, -358537222)
			c = md5hh(c, d, a, b, x[i + 3], 16, -722521979)
			b = md5hh(b, c, d, a, x[i + 6], 23, 76029189)
			a = md5hh(a, b, c, d, x[i + 9], 4, -640364487)
			d = md5hh(d, a, b, c, x[i + 12], 11, -421815835)
			c = md5hh(c, d, a, b, x[i + 15], 16, 530742520)
			b = md5hh(b, c, d, a, x[i + 2], 23, -995338651)

			a = md5ii(a, b, c, d, x[i], 6, -198630844)
			d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415)
			c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905)
			b = md5ii(b, c, d, a, x[i + 5], 21, -57434055)
			a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571)
			d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606)
			c = md5ii(c, d, a, b, x[i + 10], 15, -1051523)
			b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799)
			a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359)
			d = md5ii(d, a, b, c, x[i + 15], 10, -30611744)
			c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380)
			b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649)
			a = md5ii(a, b, c, d, x[i + 4], 6, -145523070)
			d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379)
			c = md5ii(c, d, a, b, x[i + 2], 15, 718787259)
			b = md5ii(b, c, d, a, x[i + 9], 21, -343485551)

			a = safeAdd(a, olda)
			b = safeAdd(b, oldb)
			c = safeAdd(c, oldc)
			d = safeAdd(d, oldd)
		}
		return [a, b, c, d]
	}

	function str2binl(str: string) {
		const bin: number[] = []
		const mask = (1 << 8) - 1
		for (let i = 0; i < str.length * 8; i += 8) {
			bin[i >> 5] |= (str.charCodeAt(i / 8) & mask) << (i % 32)
		}
		return bin
	}

	function binl2hex(binarray: number[]) {
		const hexTab = "0123456789abcdef"
		let str = ""
		for (let i = 0; i < binarray.length * 4; i++) {
			str +=
				hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0x0f) +
				hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0x0f)
		}
		return str
	}

	return binl2hex(binlMD5(str2binl(input), input.length * 8))
}

async function subtleHash(algo: string, text: string): Promise<string> {
	const msgBuffer = new TextEncoder().encode(text)
	const hashBuffer = await crypto.subtle.digest(algo, msgBuffer)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function HashGeneratorView() {
	const [input, setInput] = useState("")
	const [hashes, setHashes] = useState<Record<string, string>>({})
	const [copiedKey, setCopiedKey] = useState<string | null>(null)
	const [isGeneratedAnim, setIsGeneratedAnim] = useState(false)
	const {showToast} = useToast()

	useEffect(() => {
		if (!input) {
			setHashes({})
			return
		}

		const calc = async () => {
			const [sha1, sha256, sha512] = await Promise.all([
				subtleHash("SHA-1", input),
				subtleHash("SHA-256", input),
				subtleHash("SHA-512", input),
			])
			setHashes({
				MD5: md5(input),
				"SHA-1": sha1,
				"SHA-256": sha256,
				"SHA-512": sha512,
			})
			setIsGeneratedAnim(true)
			setTimeout(() => setIsGeneratedAnim(false), 300)
		}
		calc()
	}, [input])

	const copyHash = (key: string, val: string) => {
		navigator.clipboard.writeText(val)
		setCopiedKey(key)
		showToast(`${key} copied`, "success")
		setTimeout(() => setCopiedKey(null), 1200)
	}

	return (
		<div className="flex flex-col gap-3 p-3">
			<div className="flex flex-col gap-1">
				<span className="text-[11px] font-semibold text-(--p-text-subdued) uppercase">
					Input Text / Secret
				</span>
				<Textarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Type string to generate cryptographic hashes..."
					rows={8}
					className="text-[11px]"
				/>
			</div>

			<div className="space-y-2">
				{["MD5", "SHA-1", "SHA-256", "SHA-512"].map((algo) => {
					const val = hashes[algo] || ""
					const isCopied = copiedKey === algo
					return (
						<div
							key={algo}
							className="p-2.5 rounded-xl bg-(--p-surface) border border-(--p-border) flex flex-col gap-1 shadow-xs animate-card-entrance"
						>
							<div className="flex items-center justify-between text-[10px] text-(--p-text-subdued)">
								<span className="font-semibold text-[#008060] dark:text-[#34d399]">
									{algo}
								</span>
								<button
									onClick={() => val && copyHash(algo, val)}
									disabled={!val}
									className="hover:text-(--p-text) flex items-center gap-1 cursor-pointer disabled:opacity-40"
								>
									{isCopied ? (
										<CheckIcon
											size={14}
											className="text-[#008060] dark:text-[#34d399]"
										/>
									) : (
										<CopyIcon size={14} />
									)}
									<span>{isCopied ? "Copied" : "Copy"}</span>
								</button>
							</div>
							<div
								className={`font-mono text-[10px] text-(--p-text) break-all select-all bg-(--p-canvas) p-2 rounded-lg border border-(--p-border) min-h-[28px] transition-all duration-200 ${
									isGeneratedAnim
										? "animate-text-generated border-[#008060]"
										: ""
								}`}
							>
								{val || (
									<span className="text-(--p-text-subdued)">
										Waiting for input...
									</span>
								)}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
