const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { expandPath } = require("../src/glob.js")

const action = path.resolve(__dirname, "../src/action.js")

function workspace(fn) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "codepact-glob-"))
	try {
		for (const name of ["alpha", "beta"]) {
			const dir = path.join(root, "contracts", name, "src")
			fs.mkdirSync(dir, { recursive: true })
			fs.writeFileSync(path.join(dir, "error.rs"), `#[contracterror]\nenum ${name} { A = ${name === "alpha" ? 100 : 200} }`)
		}
		return fn(root)
	} finally { fs.rmSync(root, { recursive: true, force: true }) }
}

function run(root, paths) {
	return spawnSync(process.execPath, [action], {
		cwd: root, encoding: "utf8", timeout: 5000,
		env: { ...process.env, INPUT_PATHS: paths, INPUT_SUMMARY: "false", INPUT_ANNOTATE: "false", GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" },
	})
}

test("literal paths remain unchanged", () => {
	assert.deepEqual(expandPath("does-not-exist"), ["does-not-exist"])
	workspace((root) => {
		assert.match(run(root, "contracts/alpha/src").stdout, /scanned 1 enum/)
		assert.equal(run(root, "missing").status, 2)
	})
})

test("star and question mark expand path segments", () => workspace((root) => {
	assert.equal(expandPath(path.join(root, "contracts", "*", "src")).length, 2)
	assert.equal(expandPath(path.join(root, "contracts", "bet?", "src")).length, 1)
	const result = run(root, "contracts/*/src")
	assert.equal(result.status, 0, result.stdout)
	assert.match(result.stdout, /scanned 2 enum/)
}))

test("globstar matches zero and multiple directory levels without duplicate scans", () => workspace((root) => {
	fs.writeFileSync(path.join(root, "contracts", "top.rs"), "#[contracterror]\nenum Top { A = 300 }")
	const result = run(root, "contracts/**/*.rs contracts/*/src")
	assert.equal(result.status, 0, result.stdout)
	assert.match(result.stdout, /scanned 3 enum/)
}))

test("unmatched glob is an execution error", () => workspace((root) => {
	const result = run(root, "contracts/missing*/src")
	assert.equal(result.status, 2)
	assert.match(result.stdout, /did not match any paths/)
}))

test("globstar skips generated directories and symbolic links", () => workspace((root) => {
	const ignored = path.join(root, "contracts", "target")
	fs.mkdirSync(ignored)
	fs.writeFileSync(path.join(ignored, "bad.rs"), "#[contracterror] enum Bad { A = 100 }")
	fs.symlinkSync(path.join(root, "contracts"), path.join(root, "contracts", "cycle"), "dir")
	for (const pattern of ["contracts/**/*.rs", "contracts/**", "contracts"]) {
		const result = run(root, pattern)
		assert.equal(result.status, 0, result.stdout || String(result.error))
		assert.match(result.stdout, /scanned 2 enum/)
	}
}))


test("GitHub's hyphenated fail-on-findings input enables soft mode", () => workspace((root) => {
	fs.writeFileSync(path.join(root, "contracts", "duplicate.rs"), "#[contracterror]\nenum Duplicate { A = 100 }")
	const result = spawnSync(process.execPath, [action], {
		cwd: root, encoding: "utf8", timeout: 5000,
		env: { ...process.env, INPUT_PATHS: "contracts", INPUT_SUMMARY: "false", INPUT_ANNOTATE: "false", "INPUT_FAIL-ON-FINDINGS": "false", GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" },
	})
	assert.equal(result.status, 0, result.stdout)
	assert.match(result.stdout, /1 error/)
}))
