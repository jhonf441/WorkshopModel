'use strict'

// How tight the rows of the views are: compact (more rows on screen) or comfortable (bigger targets, easier on a touch screen).
// The section root carries the class mo-density-<value> (VIEW-CONTRACT.md) and every view repeats it on its own root
// (densityClass); the styles of a view set their row height, padding and font size from it. Remembered per browser under its own
// key. DensitySwitch.vue is the switch. Pure (the storage is passed in, any object with getItem / setItem):
// test/views2-density-pins.test.js.

export const DENSITIES = ['comfortable', 'compact']
export const DEFAULT_DENSITY = 'comfortable'
export const DENSITY_KEY = 'workshopModelDensity'

// the row height of each density in px (the styles of the views hold the same numbers); on a touch screen both grow
export const ROW_HEIGHT = { compact: 32, comfortable: 40 }
export const ROW_HEIGHT_TOUCH = { compact: 40, comfortable: 48 }

// every choice carries label / what / why / ifMissing / help (DESIGN.md section 7): keys of plugins.WorkshopModel.model.*
export const DENSITY_CHOICES = DENSITIES.map(id => ({
	id,
	icon: id === 'compact' ? 'mdi-view-headline' : 'mdi-view-agenda-outline',
	label: 'density_' + id,
	what: 'density_' + id + '_what',
	why: 'density_' + id + '_why',
	ifMissing: 'density_' + id + '_missing',
	help: 'density_' + id + '_help'
}))

export function normalizeDensity(value) {
	return DENSITIES.indexOf(value) >= 0 ? value : DEFAULT_DENSITY
}

export function nextDensity(value) {
	return normalizeDensity(value) === 'compact' ? 'comfortable' : 'compact'
}

export function densityClass(value) {
	return 'mo-density-' + normalizeDensity(value)
}

export function rowHeight(value, touch) {
	return (touch ? ROW_HEIGHT_TOUCH : ROW_HEIGHT)[normalizeDensity(value)]
}

export function loadDensity(storage) {
	try {
		return normalizeDensity(storage ? storage.getItem(DENSITY_KEY) : null)
	} catch (e) {
		return DEFAULT_DENSITY
	}
}

// true when it was stored (a browser without storage keeps the choice while the page is open)
export function saveDensity(storage, value) {
	try {
		storage.setItem(DENSITY_KEY, normalizeDensity(value))
		return true
	} catch (e) {
		return false
	}
}
