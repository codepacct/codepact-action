/** Markdown rendering of the discovered error-code registry. */

function toMarkdown(enums, findings) {
	const lines = ["### Codepact error-code registry", ""]

	if (enums.length === 0) {
		lines.push("No `#[contracterror]` enums found.")
		return lines.join("\n")
	}

	const rows = []
	for (const declaration of enums) {
		for (const variant of declaration.variants) {
			rows.push({
				value: variant.value,
				code: variant.value === null ? "_implicit_" : String(variant.value),
				enumName: declaration.name,
				variant: variant.name,
				source: declaration.file + ":" + variant.line,
			})
		}
	}

	rows.sort((a, b) => {
		if (a.value === null) return 1
		if (b.value === null) return -1
		return a.value - b.value
	})

	lines.push("| Code | Enum | Variant | Source |")
	lines.push("| ---: | --- | --- | --- |")
	for (const row of rows) {
		lines.push(
			"| " +
				row.code +
				" | `" +
				row.enumName +
				"` | `" +
				row.variant +
				"` | " +
				row.source +
				" |",
		)
	}

	lines.push("")
	lines.push("### Findings")
	lines.push("")

	if (findings.length === 0) {
		lines.push("No issues found.")
		return lines.join("\n")
	}

	lines.push("| Severity | Rule | Location | Detail |")
	lines.push("| --- | --- | --- | --- |")
	for (const finding of findings) {
		lines.push(
			"| " +
				finding.severity +
				" | `" +
				finding.rule +
				"` | " +
				finding.file +
				":" +
				finding.line +
				" | " +
				finding.message +
				" |",
		)
	}

	return lines.join("\n")
}

module.exports = { toMarkdown }
