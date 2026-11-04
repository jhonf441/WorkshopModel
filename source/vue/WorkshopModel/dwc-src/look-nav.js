'use strict'

// The side bar of the Model Explorer (2026-11-03 redesign): the sections in four short groups (see, change, keep, check), one icon
// each, a hint under the finger and a small count where it helps (globals, watched paths, alerts firing). The labels are keys of
// plugins.WorkshopModel.model.* (nav_<id>, look_nav_hint_<id>, look_nav_group_<group>); the page translates them. Pure (no Vue, no
// DWC): test/look-nav.test.js.

export const NAV_GROUPS = ['see', 'change', 'keep', 'check']

export const NAV_ITEMS = [
	{ id: 'tree', icon: 'mdi-view-dashboard-outline', group: 'see' },
	{ id: 'favorites', icon: 'mdi-star-outline', group: 'see' },
	{ id: 'watch', icon: 'mdi-eye-outline', group: 'see' },
	{ id: 'globals', icon: 'mdi-variable', group: 'change' },
	{ id: 'presets', icon: 'mdi-bookmark-multiple-outline', group: 'change' },
	{ id: 'snapshots', icon: 'mdi-camera-outline', group: 'keep' },
	{ id: 'usage', icon: 'mdi-file-search-outline', group: 'check' },
	{ id: 'tester', icon: 'mdi-flask-outline', group: 'check' },
	{ id: 'alerts', icon: 'mdi-bell-outline', group: 'check' },
	{ id: 'report', icon: 'mdi-clipboard-text-outline', group: 'check' }
]

// a count worth showing next to a section: 0 shows nothing
export function navBadge(id, counts) {
	const c = counts || {}
	const n = id === 'globals' ? c.globals : id === 'watch' ? c.watched : id === 'alerts' ? c.alerts : id === 'favorites' ? c.favorites : 0
	return n > 0 ? String(n > 99 ? '99+' : n) : ''
}

// the items of SideTabs.vue: t translates a key of plugins.WorkshopModel.model.*; counts = { globals, watched, alerts, favorites }
export function navItems(t, counts) {
	return NAV_ITEMS.map(it => ({
		id: it.id,
		icon: it.icon,
		label: t('nav_' + it.id),
		group: t('look_nav_group_' + it.group),
		hint: t('look_nav_hint_' + it.id),
		badge: navBadge(it.id, counts)
	}))
}
