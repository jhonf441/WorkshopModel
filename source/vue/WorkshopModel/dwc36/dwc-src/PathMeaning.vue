<template>
	<div class="mo-sub mt-3 mo-meaning">
		<div class="mo-part">{{ t('dict_title') }}</div>
		<choice-help :choice="helpChoice" :title="t('view_how')" class="mb-1" />
		<template v-if="info">
			<div class="mo-meaning-text">{{ t(info.textKey) }}</div>
			<dl class="mo-help-list">
				<template v-if="info.unitKey"><dt>{{ t('dict_label_unit') }}</dt><dd>{{ t(info.unitKey) }}</dd></template>
				<dt>{{ t('dict_label_change') }}</dt><dd>{{ t(info.changeKey) }}</dd>
				<template v-if="info.codes.length"><dt>{{ t(info.change === 'readonly' ? 'dict_label_related' : 'dict_label_codes') }}</dt><dd><code v-for="c in info.codes" :key="c" class="mo-snippet-code mr-1">{{ c }}</code></dd></template>
				<template v-if="info.since"><dt>{{ t('dict_label_since') }}</dt><dd>{{ t('dict_since_value', { version: info.since }) }}</dd></template>
			</dl>
			<div v-if="!info.available" class="wf-state warn" role="status">{{ t('dict_unavailable', { current: firmware, version: info.since }) }}</div>
		</template>
		<div v-else class="mo-faint">{{ t('dict_unknown') }}</div>
	</div>
</template>

<script>
'use strict'

// The meaning of the selected path (path-dictionary.js): what it is, its unit, whether it can be changed and with which G-code, and the
// firmware it needs, with the same fold of help every choice of the page has. A path the dictionary does not know says so.
import i18n from '../../i18n'
import ChoiceHelp from './ChoiceHelp.vue'
import { describePath, DICT_HELP } from './path-dictionary.js'

export default {
	components: { ChoiceHelp },
	props: {
		path: { type: String, default: '' },
		firmware: { type: String, default: '' }
	},
	data() {
		return { helpChoice: DICT_HELP }
	},
	computed: {
		info() {
			return describePath(this.path, this.firmware)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>
