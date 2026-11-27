const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const action = path.resolve(__dirname, "../src/action.js")
const repoRoot = path.resolve(__dirname, "..")

function parseOutputs(contents) {
	const out = {}
	for (const line of contents.trim().split(/\r?\n/)) {
		if (!line) continue
		const eq = line.indexOf("=")
		if (eq !== -1) out[line.slice(0, eq)] = line.slice(eq + 1)
	}
	return out
}

function runAction(extraEnv, cwd = repoRoot) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codepact-action-e2e-"))
	const outputFile = path.join(dir, "github_output.txt")
	const summaryFile = path.join(dir, "github_summary.md")
	const markdownFile = path.join(dir, "registry.md")
	fs.writeFileSync(outputFile, "")
	fs.writeFileSync(summaryFile, "")

	try {
		const env = {
			...process.env,
			GITHUB_OUTPUT: outputFile,
			GITHUB_STEP_SUMMARY: summaryFile,
			INPUT_ANNOTATE: "false",
			INPUT_SUMMARY: "true",
			INPUT_STRICT: "false",
			"INPUT_FAIL-ON-FINDINGS": "true",
			"INPUT_MARKDOWN-OUT": "",
			...extraEnv,
		}
		if (extraEnv.useMarkdownOut) {
			env["INPUT_MARKDOWN-OUT"] = markdownFile
			delete env.useMarkdownOut
		}

		const result = spawnSync(process.execPath, [action], {
			cwd,
			encoding: "utf8",
			timeout: 5000,
			env,
		})

		return {
			result,
			outputs: parseOutputs(fs.readFileSync(outputFile, "utf8")),
			summary: fs.readFileSync(summaryFile, "utf8"),
			markdownOut: fs.existsSync(markdownFile) ? fs.readFileSync(markdownFile, "utf8") : null,
		}
	} finally {
		fs.rmSync(dir, { recursive: true, force: true })
	}
}

test("clean fixture writes outputs, step summary, and markdown-out with exit 0", () => {
	const run = runAction({
		INPUT_PATHS: "examples/clean",
		INPUT_STRICT: "true",
		useMarkdownOut: true,
	})
	assert.equal(run.result.status, 0, run.result.stdout + run.result.stderr)
	assert.deepEqual(run.outputs, { errors: "0", warnings: "0", enums: "1" })
	assert.match(run.summary, /No issues found\./)
	assert.ok(run.markdownOut !== null)
	assert.equal(run.summary.trim(), run.markdownOut.trim())
})

test("broken fixture fails with exit 1, writes outputs, and omits summary when disabled", () => {
	const run = runAction({
		INPUT_PATHS: "examples/broken",
		INPUT_SUMMARY: "false",
		useMarkdownOut: true,
	})
	assert.equal(run.result.status, 1, run.result.stdout)
	assert.equal(run.outputs.errors, "2")
	assert.equal(run.outputs.warnings, "1")
	assert.equal(run.outputs.enums, "2")
	assert.equal(run.summary, "")
	assert.match(run.markdownOut, /code-collision/)
})

test("strict mode promotes warning-only findings to exit 1 unless fail-on-findings is false", () => {
	const ws = fs.mkdtempSync(path.join(os.tmpdir(), "codepact-action-warn-"))
	try {
		fs.writeFileSync(
			path.join(ws, "error.rs"),
			["#[contracterror]", "pub enum WarnError { First = 100, Implicit }"].join("\n"),
		)

		const relaxed = runAction({ INPUT_PATHS: ".", INPUT_STRICT: "false" }, ws)
		assert.equal(relaxed.result.status, 0, relaxed.result.stdout)
		assert.deepEqual(relaxed.outputs, { errors: "0", warnings: "1", enums: "1" })

		const strict = runAction({ INPUT_PATHS: ".", INPUT_STRICT: "true" }, ws)
		assert.equal(strict.result.status, 1, strict.result.stdout)

		const soft = runAction(
			{ INPUT_PATHS: ".", INPUT_STRICT: "true", "INPUT_FAIL-ON-FINDINGS": "false" },
			ws,
		)
		assert.equal(soft.result.status, 0, soft.result.stdout)
		assert.deepEqual(soft.outputs, { errors: "0", warnings: "1", enums: "1" })
	} finally {
		fs.rmSync(ws, { recursive: true, force: true })
	}
})

test("execution errors always exit 2 even when fail-on-findings is false", () => {
	const missingPath = runAction({
		INPUT_PATHS: "does-not-exist",
		"INPUT_FAIL-ON-FINDINGS": "false",
	})
	assert.equal(missingPath.result.status, 2)
	assert.match(missingPath.result.stdout, /::error title=Codepact::/)

	const badConfig = runAction({
		INPUT_PATHS: "examples/clean",
		INPUT_CONFIG: "does-not-exist.json",
		"INPUT_FAIL-ON-FINDINGS": "false",
	})
	assert.equal(badConfig.result.status, 2)
	assert.match(badConfig.result.stdout, /Could not read config/)
})
