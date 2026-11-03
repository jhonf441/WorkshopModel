<template>
	<div class="mo-usage-scope">
		<div class="mo-part">{{ t('usage_scope_title') }}</div>
		<div class="mo-usage-set">
			<v-checkbox :input-value="scope.chain" dense hide-details :label="t(S.chain.label)" @change="set({ chain: !!$event })" />
			<choice-help :choice="S.chain" :title="t('help_how')" />
		</div>
		<div class="mo-usage-set">
			<div class="mo-faint">{{ t(S.folder.label) }}</div>
			<div class="mo-usage-folders">
				<v-checkbox v-for="f in folderRows" :key="f.dir" :input-value="f.on" dense hide-details :label="f.label" @change="setDir(f.dir, !!$event)" />
			</div>
			<choice-help :choice="S.folder" :title="t('help_how')" />
		</div>
		<div class="mo-usage-set mo-form">
			<v-select :value="scope.depth" :items="depths" dense outlined hide-details class="mo-field-type" :label="t(S.depth.label)" @change="set({ depth: $event })" />
			<choice-help :choice="S.depth" :title="t('help_how')" />
		</div>
		<div class="mo-usage-set">
			<v-checkbox :input-value="scope.hide" dense hide-details :label="t(S.hide.label)" @change="set({ hide: !!$event })" />
			<choice-help :choice="S.hide" :title="t('help_how')" />
		</div>
	</div>
</template>

<script>
'use strict'

// What the usage finder reads (usage-scope.js): the M98 chain of config.g, the folders (the two roots and every folder the last scan
// found, an excluded one with its reason, which the person can still switch on), the depth and the switch that leaves out backups, examples and plugin folders.
// Each setting carries its help. It only says what was picked: the section keeps the scope and remembers it in this browser.
import i18n from '../../i18n'
import ChoiceHelp from './ChoiceHelp.vue'
import { SCOPE_SETTINGS, ROOT_DIRS, DEPTH_MIN, DEPTH_MAX, cleanScope, folderOn } from './usage-scope.js'

export default {
	components: { ChoiceHelp },
	props: {
		scope: { type: Object, required: true },
		folders: { type: Array, default: () => [] }
	},
	data() {
		return { S: SCOPE_SETTINGS, depths: Array.from({ length: DEPTH_MAX - DEPTH_MIN + 1 }, (_, i) => DEPTH_MIN + i) }
	},
	computed: {
		folderRows() {
			const roots = ROOT_DIRS.map(dir => ({ dir, on: !!this.scope.dirs[dir], excluded: false, label: dir }))
			const found = this.folders.map(f => {
				const note = f.excluded ? this.t('usage_folder_excluded') : (f.reached ? '' : this.t('usage_folder_below'))
				return { dir: f.dir, on: folderOn(this.scope, f.dir, f.excluded), excluded: f.excluded, label: f.dir + (note ? ' (' + note + ')' : '') }
			})
			return roots.concat(found)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		set(change) {
			this.$emit('update:scope', cleanScope(Object.assign({}, this.scope, change)))
		},
		setDir(dir, on) {
			this.set({ dirs: Object.assign({}, this.scope.dirs, { [dir]: on }) })
		}
	}
}
</script>
