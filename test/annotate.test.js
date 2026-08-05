const test = require("node:test")
const assert = require("node:assert/strict")

const { toAnnotation, toAnnotations, escapeData, escapeProperty } = require("../src/annotate.js")

test("an error finding becomes an ::error command on the offending line", () => {
	const command = toAnnotation({
		severity: "error",
		rule: "code-collision",
		file: "contracts/router/src/error.rs",
		line: 17,
		message: "RouterError and FactoryError both define code 300.",
	})

	assert.equal(
		command,
		"::error file=contracts/router/src/error.rs,line=17,title=Codepact%3A code-collision::" +
			"RouterError and FactoryError both define code 300.",
	)
})

test("a warning finding becomes a ::warning command", () => {
	const command = toAnnotation({
		severity: "warning",
		rule: "implicit-discriminant",
		file: "error.rs",
		line: 4,
		message: "No explicit discriminant.",
	})

	assert.match(command, /^::warning /)
})

test("newlines in a message are escaped, not left to truncate the command", () => {
	const command = toAnnotation({
		severity: "error",
		rule: "duplicate-discriminant",
		file: "error.rs",
		line: 9,
		message: "first line\nsecond line",
	})

	assert.ok(!command.includes("\n"), "the command must stay on a single line")
	assert.ok(command.endsWith("first line%0Asecond line"))
})

test("a percent sign is escaped before anything else, so escaping is not doubled", () => {
	assert.equal(escapeData("100% of calls"), "100%25 of calls")
	assert.equal(escapeData("already %0A escaped"), "already %250A escaped")
})

test("commas and colons in a path cannot break the property list", () => {
	assert.equal(escapeProperty("weird,path:name.rs"), "weird%2Cpath%3Aname.rs")
})

test("findings are annotated in order, one command each", () => {
	const commands = toAnnotations([
		{ severity: "error", rule: "a", file: "one.rs", line: 1, message: "first" },
		{ severity: "warning", rule: "b", file: "two.rs", line: 2, message: "second" },
	])

	assert.equal(commands.length, 2)
	assert.match(commands[0], /one\.rs/)
	assert.match(commands[1], /two\.rs/)
})

test("no findings produces no commands", () => {
	assert.deepEqual(toAnnotations([]), [])
})
