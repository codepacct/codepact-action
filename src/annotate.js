/**
 * GitHub workflow command formatting.
 *
 * A finding is only useful to a reviewer if it lands on the line that caused
 * it. These helpers turn findings into `::error` and `::warning` workflow
 * commands, which GitHub renders directly on the diff.
 *
 * Escaping matters: an unescaped newline truncates the command and the
 * annotation silently loses everything after it, which is worse than no
 * annotation at all.
 */

/** Escape a value used in the `file=`/`line=` property section. */
function escapeProperty(value) {
	return String(value)
		.replace(/%/g, "%25")
		.replace(/\r/g, "%0D")
		.replace(/\n/g, "%0A")
		.replace(/:/g, "%3A")
		.replace(/,/g, "%2C")
}

/** Escape the message body of a workflow command. */
function escapeData(value) {
	return String(value).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A")
}

/**
 * @param {{severity: string, rule: string, file: string, line: number, message: string}} finding
 * @returns {string} A single workflow command line.
 */
function toAnnotation(finding) {
	const command = finding.severity === "error" ? "error" : "warning"
	const properties = [
		"file=" + escapeProperty(finding.file),
		"line=" + escapeProperty(finding.line),
		"title=" + escapeProperty("Codepact: " + finding.rule),
	].join(",")

	return "::" + command + " " + properties + "::" + escapeData(finding.message)
}

/** @returns {string[]} One workflow command per finding, in order. */
function toAnnotations(findings) {
	return findings.map(toAnnotation)
}

module.exports = { toAnnotation, toAnnotations, escapeData, escapeProperty }
