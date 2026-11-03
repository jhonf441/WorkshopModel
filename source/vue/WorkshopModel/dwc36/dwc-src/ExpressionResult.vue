<template>
	<div class="mo-sub mt-2" role="status">
		<div class="mo-part">{{ result.ok ? t('tester_result') : t('tester_result_error') }}</div>
		<div v-if="result.ok" class="mo-xb-typed">
			<kind-chip :kind="result.type" />
			<span class="mo-faint">{{ t('rtype_label') }}: {{ t('rtype_' + result.type) }}<span v-if="result.size !== null"> ({{ t('rtype_size', { n: result.size }) }})</span></span>
		</div>
		<template v-else-if="result.problem">
			<div class="mo-error" role="alert">{{ t('error_' + result.problem.kind, { what: result.problem.what }) }}</div>
			<div class="mo-faint">{{ t('error_' + result.problem.kind + '_hint') }}</div>
		</template>
		<div class="mo-faint mt-1">{{ t('rtype_raw') }}</div>
		<pre class="mo-result-text" :class="{ 'mo-result-bad': !result.ok }">{{ result.text }}</pre>
	</div>
</template>

<script>
'use strict'

// The answer of the board read for a person (expression-result.js): its type with a chip and, for an error, what it means in plain
// words with a hint; the raw text stays below.
import i18n from '../../i18n'
import KindChip from './KindChip.vue'

export default {
	components: { KindChip },
	props: { result: { type: Object, required: true } },
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>
