<template>
	<section class="mo-topic" :aria-labelledby="'mo-topic-' + card.id">
		<div class="mo-topic-head">
			<v-icon size="20">{{ card.icon }}</v-icon>
			<span :id="'mo-topic-' + card.id" class="mo-topic-title">{{ t(card.title) }}</span>
			<v-btn v-if="card.path" size="x-small" variant="text" class="mo-topic-all" :title="t('topic_see_all_help', { path: card.path })" @click="emit('open', card.path)">{{ t('topic_see_all') }}</v-btn>
		</div>
		<div v-if="card.off" class="mo-faint" role="status">{{ t(card.off) }}</div>
		<div v-else-if="card.empty" class="mo-faint">{{ t('topic_empty') }}</div>
		<div v-if="card.id === 'other'" class="mo-faint mb-1">{{ t('topic_other_help') }}</div>
		<button v-for="r in card.rows" :key="r.id" type="button" class="mo-topic-row" :class="{ 'mo-topic-row-changed': justChanged(r.path) }" :title="t('topic_open_row', { path: r.path })" @click="emit('open', r.path)">
			<span class="mo-topic-main">
				<span class="mo-topic-label">{{ labelOf(r) }}</span>
				<span v-if="r.aside || (r.state && r.unit !== 'state')" class="mo-topic-sub">
					<span v-if="r.aside">{{ asideOf(r) }}</span>
					<span v-if="r.state && r.unit !== 'state'" :class="['wf-state', r.state.level]">{{ wordOf(r.state) }}</span>
				</span>
			</span>
			<span class="mo-topic-value"><span v-if="r.unit === 'state' && r.state" :class="['wf-state', r.state.level]">{{ valueOf(r.value, r.unit) }}</span><template v-else>{{ valueOf(r.value, r.unit) }}</template></span>
		</button>
		<div v-if="card.more" class="mo-faint mt-1">{{ t('topic_more', { n: card.more }) }}</div>
	</section>
</template>

<script setup>
// One card of the Topics view (topic-catalog.js): a title with its gray icon, "See all" (the branch in the technical tree), and the
// readable rows: the label, the value with its unit (value-human.js), a short second line (a target, the machine position) and the
// state as a dot + the word (DESIGN.md). A row opens its own path in the technical tree. A value that just changed glows for a moment
// (changeTimes of the view contract, globals-quick.js recentlyChanged).
import { i18n } from './dwc-host.js'
import { unitText } from './value-human.js'
import { recentlyChanged } from './globals-quick.js'

const props = defineProps({
	card: { type: Object, required: true },
	changeTimes: { type: Map, default: () => new Map() },
	now: { type: Number, default: 0 }
})
const emit = defineEmits(['open'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

function labelOf(r) {
	return r.label.text !== undefined ? r.label.text : t(r.label.key, r.label.params)
}
function valueOf(value, unit) {
	const u = unitText(value, unit)
	return t(u.key, u.params)
}
function asideOf(r) {
	return t(r.aside.key, { v: valueOf(r.aside.value, r.aside.unit) })
}
function wordOf(s) {
	return s.key ? t(s.key) : s.text
}
function justChanged(path) {
	return !!props.now && recentlyChanged(props.changeTimes.get(path), props.now)
}
</script>
