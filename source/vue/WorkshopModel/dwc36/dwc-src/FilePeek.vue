<template>
	<div class="mo-peek mo-fade-in" role="region" :aria-label="t('peek_title', { path })">
		<div class="mo-peek-head">
			<code class="mo-peek-path" :title="path">{{ path }}</code>
			<span v-if="line" class="mo-faint">{{ t('peek_at', { n: line }) }}</span>
			<span class="mo-peek-legend" role="group"><span v-for="k in KINDS" :key="k" class="mo-peek-mark" :class="'k-' + k">{{ t('usage_kind_' + k) }}</span></span>
			<span class="mo-peek-actions">
				<v-btn x-small outlined @click="copy"><v-icon :size="14" class="mr-1">mdi-content-copy</v-icon>{{ t('peek_copy') }}</v-btn>
				<v-btn x-small text @click="$emit('close')">{{ t('close') }}</v-btn>
			</span>
		</div>
		<div v-if="state === 'loading'" class="mo-faint" role="status">{{ t('peek_loading') }}</div>
		<div v-else-if="state === 'missing'" class="mo-faint" role="status">{{ t('peek_missing') }}</div>
		<div v-else-if="state === 'error'" class="mo-error" role="alert">{{ t('peek_error') }}</div>
		<template v-else>
			<div v-if="view.cut" class="mo-faint">{{ t('peek_window', { from: view.from, to: view.to, total: view.total }) }}</div>
			<div ref="box" class="mo-peek-box" tabindex="0" :aria-label="t('peek_box')">
				<div v-for="r in view.rows" :key="r.n" class="mo-peek-row" :class="rowClass(r)" :ref="r.hit ? 'hit' : null">
					<span class="mo-peek-n">{{ r.n }}</span>
					<span class="mo-peek-text"><template v-for="(p, i) in parts(r)"><mark v-if="p.mark" :key="i" class="mo-peek-mark" :class="'k-' + p.mark">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></span>
				</div>
			</div>
		</template>
		<div v-if="copied" class="mo-faint" role="status">{{ t('usage_detail_copied', { text: copied }) }}</div>
	</div>
</template>

<script>
'use strict'

// The small viewer of the usage finder: a click on "line N" of a file opens the file here with that line selected and the global marked inside it,
// so the use is seen in its place instead of only a number. The selected line and every mark carry the colour of what the line does with the
// global (created green, written amber, read blue: look-tokens.js, the same colours as the chips and the legend). It reads the file once and only
// when it opens; the file is not changed.
import i18n from '../../i18n'
import { readText } from './model-host.js'
import { copyText } from './copy-text.js'
import { peekRows } from './file-peek.js'
import { markLine, lineKind } from './peek-mark.js'
import { USAGE_KINDS, usageKindClass } from './look-tokens.js'

export default {
	props: {
		path: { type: String, required: true },
		line: { type: Number, default: 0 },
		name: { type: String, default: '' }, // the global to mark inside the line
		kind: { type: String, default: '' }, // 'define' | 'set' | 'read': the chip that opened the viewer (used when the line itself says nothing)
		all: { type: Boolean, default: true } // mark the global in every line, each in the colour of its own kind, not only in the line of the chip
	},
	data() {
		return { state: 'loading', text: '', copied: '', KINDS: USAGE_KINDS }
	},
	computed: {
		view() {
			return peekRows(this.text, this.line)
		}
	},
	watch: {
		path: { immediate: true, handler: 'load' },
		line() {
			this.$nextTick(this.reveal)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		parts(row) {
			return row.hit || this.all ? markLine(row.text, this.name) : [{ text: row.text, mark: '' }]
		},
		// only the selected line is painted as a row, in the colour of what IT does with the global (the chip's kind when the line says nothing)
		rowClass(row) {
			if (!row.hit) return ''
			const k = usageKindClass(lineKind(markLine(row.text, this.name)) || this.kind)
			return k ? 'hit ' + k : 'hit'
		},
		async load() {
			this.state = 'loading'
			this.copied = ''
			try {
				const t = await readText(this.path)
				if (t === null) {
					this.state = 'missing'
					return
				}
				this.text = t
				this.state = 'ready'
				this.$nextTick(this.reveal)
			} catch (e) {
				this.state = 'error'
			}
		},
		// the line of the use in the middle of the box (the box scrolls, not the page)
		reveal() {
			const box = this.$refs.box
			const hit = this.$refs.hit && (Array.isArray(this.$refs.hit) ? this.$refs.hit[0] : this.$refs.hit)
			if (box && hit) box.scrollTop = Math.max(0, hit.offsetTop - box.clientHeight / 2 + hit.clientHeight / 2)
		},
		async copy() {
			const ref = this.path + (this.line ? ':' + this.line : '')
			if (await copyText(ref)) this.copied = ref
		}
	}
}
</script>
