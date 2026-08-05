/**
 * Action input handling.
 *
 * GitHub passes `with:` values as INPUT_<NAME> environment variables, with the
 * name upper-cased and dashes replaced by underscores. Reading them directly
 * keeps this action dependency-free, which matters because it has to run in
 * contract repositories that have no JavaScript toolchain.
 */

function rawInput(name, env) {
	const source = env || process.env
	const key = "INPUT_" + name.replace(/ /g, "_").replace(/-/g, "_").toUpperCase()
	const value = source[key]
	return value === undefined ? "" : value.trim()
}

function booleanInput(name, fallback, env) {
	const value = rawInput(name, env).toLowerCase()
	if (value === "") return fallback
	if (value === "true" || value === "1" || value === "yes") return true
	if (value === "false" || value === "0" || value === "no") return false
	throw new Error(
		'Input "' + name + '" must be true or false, received "' + rawInput(name, env) + '".',
	)
}

function pathsInput(env) {
	const value = rawInput("paths", env)
	if (value === "") return ["."]
	return value
		.split(/[\s\n]+/)
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)
}

function readOptions(env) {
	return {
		paths: pathsInput(env),
		config: rawInput("config", env),
		markdownOut: rawInput("markdown-out", env),
		strict: booleanInput("strict", false, env),
		annotate: booleanInput("annotate", true, env),
		summary: booleanInput("summary", true, env),
		failOnFindings: booleanInput("fail-on-findings", true, env),
	}
}

module.exports = { rawInput, booleanInput, pathsInput, readOptions }
