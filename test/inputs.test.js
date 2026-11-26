const test = require("node:test")
const assert = require("node:assert/strict")

const { rawInput, booleanInput, pathsInput, readOptions } = require("../src/inputs.js")

test("dashed input names use the runner's hyphenated environment key", () => {
	assert.equal(rawInput("markdown-out", { "INPUT_MARKDOWN-OUT": "registry.md" }), "registry.md")
	assert.equal(rawInput("markdown-out", { INPUT_MARKDOWN_OUT: "legacy.md" }), "legacy.md")
	assert.equal(rawInput("markdown-out", { "INPUT_MARKDOWN-OUT": "runner.md", INPUT_MARKDOWN_OUT: "legacy.md" }), "runner.md")
})

test("a missing input is an empty string, not undefined", () => {
	assert.equal(rawInput("config", {}), "")
})

test("input values are trimmed, since YAML block scalars add whitespace", () => {
	assert.equal(rawInput("config", { INPUT_CONFIG: "  codepact.json \n" }), "codepact.json")
})

test("boolean inputs accept the forms people actually write", () => {
	assert.equal(booleanInput("strict", false, { INPUT_STRICT: "true" }), true)
	assert.equal(booleanInput("strict", false, { INPUT_STRICT: "TRUE" }), true)
	assert.equal(booleanInput("strict", false, { INPUT_STRICT: "yes" }), true)
	assert.equal(booleanInput("strict", true, { INPUT_STRICT: "false" }), false)
	assert.equal(booleanInput("strict", true, { INPUT_STRICT: "0" }), false)
})

test("an unset boolean input falls back rather than silently becoming false", () => {
	assert.equal(booleanInput("annotate", true, {}), true)
})

test("a misspelled boolean is rejected instead of being read as false", () => {
	assert.throws(
		() => booleanInput("strict", false, { INPUT_STRICT: "ture" }),
		/must be true or false/,
	)
})

test("paths defaults to the workspace root", () => {
	assert.deepEqual(pathsInput({}), ["."])
})

test("paths splits on whitespace and on newlines", () => {
	assert.deepEqual(pathsInput({ INPUT_PATHS: "contracts/  shared/\nlib/" }), [
		"contracts/",
		"shared/",
		"lib/",
	])
})

test("readOptions applies every documented default", () => {
	assert.deepEqual(readOptions({}), {
		paths: ["."],
		config: "",
		markdownOut: "",
		strict: false,
		annotate: true,
		summary: true,
		failOnFindings: true,
	})
})
