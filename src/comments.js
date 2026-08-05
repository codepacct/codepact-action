/**
 * Blanking pass for Rust source text.
 *
 * Comments, string literals, raw string literals and character literals are
 * replaced with spaces so later passes can search the source with plain string
 * operations without matching text that only looks like code. Newlines are
 * preserved and every replacement is the same length as what it replaces, so
 * offsets and line numbers stay valid.
 *
 * Vendored from codepact-core. See VENDORING.md.
 */

const IDENT_CHAR = /[A-Za-z0-9_]/

function blankComments(source) {
	const out = source.split("")
	const length = source.length
	let i = 0

	const blank = (from, to) => {
		for (let k = from; k < to && k < length; k++) {
			if (out[k] !== "\n") out[k] = " "
		}
	}

	while (i < length) {
		const ch = source[i]

		if (ch === "/" && source[i + 1] === "/") {
			let j = i
			while (j < length && source[j] !== "\n") j++
			blank(i, j)
			i = j
			continue
		}

		if (ch === "/" && source[i + 1] === "*") {
			let depth = 1
			let j = i + 2
			while (j < length && depth > 0) {
				if (source[j] === "/" && source[j + 1] === "*") {
					depth++
					j += 2
					continue
				}
				if (source[j] === "*" && source[j + 1] === "/") {
					depth--
					j += 2
					continue
				}
				j++
			}
			blank(i, j)
			i = j
			continue
		}

		const hashes = rawStringHashes(source, i)
		if (hashes !== -1) {
			const end = endOfRawString(source, i, hashes)
			blank(i, end)
			i = end
			continue
		}

		if (ch === '"') {
			const end = endOfString(source, i)
			blank(i, end)
			i = end
			continue
		}

		if (ch === "'") {
			const end = endOfCharLiteral(source, i)
			if (end !== -1) {
				blank(i, end)
				i = end
				continue
			}
		}

		i++
	}

	return out.join("")
}

function rawStringHashes(source, i) {
	const previous = i > 0 ? source[i - 1] : " "
	if (IDENT_CHAR.test(previous)) return -1

	let j = i
	if (source[j] === "b") j++
	if (source[j] !== "r") return -1
	j++

	let hashes = 0
	while (source[j] === "#") {
		hashes++
		j++
	}
	return source[j] === '"' ? hashes : -1
}

function endOfRawString(source, i, hashes) {
	const openQuote = source.indexOf('"', i)
	const terminator = '"' + "#".repeat(hashes)
	const end = source.indexOf(terminator, openQuote + 1)
	return end === -1 ? source.length : end + terminator.length
}

function endOfString(source, i) {
	let j = i + 1
	while (j < source.length) {
		if (source[j] === "\\") {
			j += 2
			continue
		}
		if (source[j] === '"') return j + 1
		j++
	}
	return source.length
}

function endOfCharLiteral(source, i) {
	const window = source.slice(i, i + 16)
	const match = /^'(\\(?:x[0-9a-fA-F]{2}|u\{[0-9a-fA-F]{1,6}\}|.)|[^\\'])'/.exec(window)
	return match ? i + match[0].length : -1
}

module.exports = { blankComments }
