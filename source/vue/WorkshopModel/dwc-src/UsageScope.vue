<template>
	<div class="mo-usage-scope">
		<div class="mo-part">{{ t('usage_scope_title') }}</div>
		<div class="mo-usage-set">
			<v-checkbox :model-value="scope.chain" density="compact" hide-details :label="t(S.chain.label)" @update:model-value="set({ chain: !!$event })" />
			<choice-help :choice="S.chain" :title="t('help_how')" />
		</div>
		<div class="mo-usage-set">
			<div class="mo-faint">{{ t(S.folder.label) }}</div>
			<div class="mo-usage-folders">
				<v-checkbox v-for="f in folderRows" :key="f.dir" :model-value="f.on" density="compact" hide-details :label="f.label" @update:model-value="setDir(f.dir, !!$event)" />
			</div>
			<choice-help :choice="S.folder" :title="t('help_how')" />
		</div>
		<div class="mo-usage-set mo-form">
			<v-select :model-value="scope.depth" :items="depths" density="compact" variant="outlined" hide-details class="mo-field-type" :label="t(S.depth.label)" @update:model-value="set({ depth: $event })" />
			<choice-help :choice="S.depth" :title="t('help_how')" />
		</div>
		<div class="mo-usage-set">
			<v-checkbox :model-value="scope.hide" density="compact" hide-details :label="t(S.hide.label)" @update:model-value="set({ hide: !!$event })" />
			<choice-help :choice="S.hide" :title="t('help_how')" />
		</div>
	</div>
</template>

<script setup>
// What the usage finder reads (usage-scope.js): the M98 chain of config.g, the folders (the two roots and every folder the last scan
// found, an excluded one with its reason, which the person can still switch on), the depth and the switch that leaves out backups, examples and plugin folders.
// Each setting carries its help. It only says what was picked: the section keeps the scope and remembers it in this browser.
import { computed } from 'vue'
import { i18n } from './dwc-host.js'
import ChoiceHelp from './ChoiceHelp.vue'
import { SCOPE_SETTINGS, ROOT_DIRS, DEPTH_MIN, DEPTH_MAX, cleanScope, folderOn } from './usage-scope.js'

const props = defineProps({
	scope: { type: Object, required: true },
	folders: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:scope'])

const S = SCOPE_SETTINGS
const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const depths = Array.from({ length: DEPTH_MAX - DEPTH_MIN + 1 }, (_, i) => DEPTH_MIN + i)
const folderRows = computed(() => {
	const roots = ROOT_DIRS.map(dir => ({ dir, on: !!props.scope.dirs[dir], excluded: false, label: dir }))
	const found = props.folders.map(f => {
		const note = f.excluded ? t('usage_folder_excluded') : (f.reached ? '' : t('usage_folder_below'))
		return { dir: f.dir, on: folderOn(props.scope, f.dir, f.excluded), excluded: f.excluded, label: f.dir + (note ? ' (' + note + ')' : '') }
	})
	return roots.concat(found)
})

function set(change) {
	emit('update:scope', cleanScope(Object.assign({}, props.scope, change)))
}
function setDir(dir, on) {
	set({ dirs: Object.assign({}, props.scope.dirs, { [dir]: on }) })
}
</script>
