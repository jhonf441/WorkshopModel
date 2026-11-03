'use strict'

// The color of each section of the Model Explorer, one place (the family reads it as --wf-sec on the page root: the 2 px line on
// top of the cards and the line of the open side item). The badge color of the page bar is in vue/_shared/plugin-colors.js.

export const SECTION_COLORS = {
	tree: '#1E88E5',
	globals: '#FB8C00',
	watch: '#26A69A',
	presets: '#AB47BC',
	usage: '#7E57C2',
	snapshots: '#5C6BC0',
	tester: '#8D6E63',
	alerts: '#F4511E',
	report: '#546E7A'
}

export function sectionColor(id) {
	return SECTION_COLORS[id] || '#1E88E5'
}
