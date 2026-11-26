/** Small, dependency-free path globber for the Node 20 action runtime. */
const fs = require("node:fs")
const path = require("node:path")

const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", "target", "dist", "build"])

function hasWildcard(value) {
	return /[*?]/.test(value)
}

function segmentPattern(segment) {
	let result = "^"
	for (const char of segment) {
		if (char === "*") result += ".*"
		else if (char === "?") result += "."
		else result += char.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")
	}
	return new RegExp(result + "$")
}

/** Expand * and ? within a path segment and ** across directory segments. */
function expandPath(pattern) {
	if (!hasWildcard(pattern)) return [pattern]

	const absolute = path.resolve(pattern)
	const root = path.parse(absolute).root
	const segments = absolute.slice(root.length).split(path.sep).filter(Boolean)
	const matches = new Set()

	function entries(directory) {
		try {
			return fs.readdirSync(directory, { withFileTypes: true })
		} catch (error) {
			if (error.code === "ENOENT" || error.code === "ENOTDIR") return []
			throw error
		}
	}

	function visit(current, index) {
		if (index === segments.length) {
			try { fs.statSync(current); matches.add(current) }
			catch (error) {
				if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error
			}
			return
		}
		const segment = segments[index]
		if (segment === "**") {
			visit(current, index + 1)
			for (const entry of entries(current)) {
				if (entry.isDirectory() && !SKIPPED_DIRECTORIES.has(entry.name)) {
					visit(path.join(current, entry.name), index)
				}
			}
		} else if (hasWildcard(segment)) {
			const matcher = segmentPattern(segment)
			for (const entry of entries(current)) {
				if (entry.isSymbolicLink() || SKIPPED_DIRECTORIES.has(entry.name)) continue
				if (matcher.test(entry.name)) visit(path.join(current, entry.name), index + 1)
			}
		} else {
			visit(path.join(current, segment), index + 1)
		}
	}

	visit(root, 0)
	if (matches.size === 0) throw new Error('Path pattern "' + pattern + '" did not match any paths.')
	return [...matches].sort()
}

module.exports = { expandPath }
