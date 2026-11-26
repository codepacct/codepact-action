#!/usr/bin/env node

/**
 * Codepact GitHub Action entry point.
 *
 * Scans the requested paths for `#[contracterror]` enums, applies the
 * error-code integrity rules, and reports every finding as a GitHub annotation
 * on the line that caused it.
 *
 * There are no dependencies and no build step, so the action runs on the
 * node20 runner with nothing installed.
 */

const fs = require("node:fs")
const path = require("node:path")

const { parseContractErrors } = require("./parse.js")
const { analyze, summarize } = require("./analyze.js")
const { toAnnotations } = require("./annotate.js")
const { toMarkdown } = require("./registry.js")
const { readOptions } = require("./inputs.js")
const { expandPath } = require("./glob.js")

const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", "target", "dist", "build"])

function collectRustFiles(root) {
	const found = []
	const stack = [root]

	while (stack.length > 0) {
		const current = stack.pop()

		let stats
		try {
			// An explicitly supplied symlink remains supported, but nested links
			// are not followed: they can point back to an ancestor directory.
			if (current !== root && fs.lstatSync(current).isSymbolicLink()) continue
			stats = fs.statSync(current)
		} catch (error) {
			throw new Error('Path "' + current + '" could not be read: ' + error.message)
		}

		if (stats.isDirectory()) {
			for (const entry of fs.readdirSync(current)) {
				if (SKIPPED_DIRECTORIES.has(entry)) continue
				stack.push(path.join(current, entry))
			}
			continue
		}

		if (current.endsWith(".rs")) found.push(current)
	}

	return found.sort()
}

function setOutput(name, value) {
	const file = process.env.GITHUB_OUTPUT
	if (!file) return
	fs.appendFileSync(file, name + "=" + String(value) + "\n")
}

function appendSummary(markdown) {
	const file = process.env.GITHUB_STEP_SUMMARY
	if (!file) return
	fs.appendFileSync(file, markdown + "\n")
}

function run() {
	const options = readOptions()

	let config = {}
	if (options.config !== "") {
		try {
			config = JSON.parse(fs.readFileSync(options.config, "utf8"))
		} catch (error) {
			throw new Error('Could not read config "' + options.config + '": ' + error.message)
		}
	}

	const enums = []
	const seenFiles = new Set()
	for (const pattern of options.paths) {
		for (const target of expandPath(pattern)) {
			for (const file of collectRustFiles(target)) {
				const absolute = path.resolve(file)
				if (seenFiles.has(absolute)) continue
				seenFiles.add(absolute)
				const source = fs.readFileSync(file, "utf8")
				// Cheap pre-filter: skip files that cannot possibly contain the
				// attribute. This only needs to be a safe superset of what
				// parseContractErrors recognises (including qualified paths such
				// as `#[core::contracterror]`), so a plain substring check on the
				// word is enough and avoids running the full parser on every file.
				if (!source.includes("contracterror")) continue
				enums.push(...parseContractErrors(source, path.relative(process.cwd(), file) || file))
			}
		}
	}

	const findings = analyze(enums, config)
	const counts = summarize(findings)
	const unresolvedCount = enums
		.flatMap((declaration) => declaration.variants)
		.filter((variant) => variant.valueState === "unresolved").length

	if (options.annotate) {
		for (const annotation of toAnnotations(findings)) {
			process.stdout.write(annotation + "\n")
		}
	}

	if (unresolvedCount > 0) {
		process.stdout.write(
			"::warning title=Codepact::" +
				unresolvedCount +
				" explicit discriminant(s) use expressions this tool cannot evaluate " +
				"and were excluded from duplicate, collision, and range checks. Review " +
				"them manually.\n",
		)
	}

	const markdown = toMarkdown(enums, findings)
	if (options.summary) appendSummary(markdown)
	if (options.markdownOut !== "") fs.writeFileSync(options.markdownOut, markdown + "\n")

	setOutput("errors", counts.errors)
	setOutput("warnings", counts.warnings)
	setOutput("enums", enums.length)

	process.stdout.write(
		"Codepact scanned " +
			enums.length +
			" enum(s): " +
			counts.errors +
			" error(s), " +
			counts.warnings +
			" warning(s)" +
			(unresolvedCount > 0 ? ", " + unresolvedCount + " unresolved discriminant(s)" : "") +
			".\n",
	)

	const failed = counts.errors > 0 || (options.strict && counts.warnings > 0)
	return failed && options.failOnFindings ? 1 : 0
}

try {
	process.exitCode = run()
} catch (error) {
	process.stdout.write("::error title=Codepact::" + error.message.replace(/\n/g, "%0A") + "\n")
	process.exitCode = 2
}
