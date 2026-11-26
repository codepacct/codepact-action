const test = require("node:test")
const assert = require("node:assert/strict")

const { parseContractErrors } = require("../src/parse.js")
const { analyze } = require("../src/analyze.js")
const { toMarkdown } = require("../src/registry.js")

test("the registry table is sorted by code, with implicit codes last", () => {
	const enums = parseContractErrors(
		[
			"#[contracterror]",
			"pub enum TokenError {",
			"    Later = 102,",
			"    Earlier = 100,",
			"    Unnumbered,",
			"}",
		].join("\n"),
		"token.rs",
	)

	const markdown = toMarkdown(enums, [])
	const earlier = markdown.indexOf("`Earlier`")
	const later = markdown.indexOf("`Later`")
	const unnumbered = markdown.indexOf("`Unnumbered`")

	assert.ok(earlier < later, "100 should come before 102")
	assert.ok(later < unnumbered, "implicit codes belong at the end")
})

test("a clean workspace still renders a registry, and says so", () => {
	const enums = parseContractErrors(
		["#[contracterror]", "pub enum E {", "    A = 1,", "}"].join("\n"),
		"e.rs",
	)

	const markdown = toMarkdown(enums, analyze(enums))

	assert.match(markdown, /No issues found\./)
})

test("an empty scan is reported rather than rendering an empty table", () => {
	assert.match(toMarkdown([], []), /No `#\[contracterror\]` enums found\./)
})

test("escapes repository-controlled table paths and findings", () => {
	const path = "contracts/a|b\\c\n<script>.rs"
	const enums = parseContractErrors("#[contracterror] enum E { A = 1, }", path)
	const markdown = toMarkdown(enums, [{severity: "error", rule: "example", file: path, line: 3, message: "bad | <details>\n**text**"}])
	assert.match(markdown, /a\\\|b\\\\c &lt;script&gt;\.rs/)
	assert.match(markdown, /bad \\\| &lt;details&gt; \\\*\\\*text\\\*\\\*/)
	assert.doesNotMatch(markdown, /<script>|<details>/)
	assert.equal(markdown.split("\n").filter((line) => line.includes("script")).length, 2)
})
