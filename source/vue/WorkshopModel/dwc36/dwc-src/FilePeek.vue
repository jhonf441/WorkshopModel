<template>
	<div class="mo-peek mo-fade-in" role="region" :aria-label="t('peek_title', { path })">
		<div class="mo-peek-head">
			<code class="mo-peek-path" :title="path">{{ path }}</code>
			<span v-if="line" class="mo-faint">{{ t('peek_at', { n: line }) }}</span>
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
				<div v-for="r in view.rows" :key="r.n" class="mo-peek-row" :class="{ hit: r.hit }" :ref="r.hit ? 'hit' : null">
					<span class="mo-peek-n">{{ r.n }}</span>
					<span class="mo-peek-text"><template v-for="(p, i) in parts(r)"><mark v-if="p.mark" :key="i" class="mo-peek-mark">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></span>
				</div>
			</div>
		</template>
		<div v-if="copied" class="mo-faint" role="status">{{ t('usage_detail_copied', { text: copied }) }}</div>
	</div>
</template>

<script>
'use strict'

// The small viewer of the usage finder: a click on "line N" of a file opens the file here with that line selected and the global marked inside it,
// so the use is seen in its place instead of only a number. It reads the file once and only when it opens; the file is not changed.
import i18n from '../../i18n'
import { readText } from './model-host.js'
import { copyText } from './copy-text.js'
import { peekRows, splitMark } from './file-peek.js'

export default {
	props: {
		path: { type: String, required: true },
		line: { type: Number, default: 0 },
		name: { type: String, default: '' } // the global to mark inside the line
	},
	data() {
		return { state: 'loading', text: '', copied: '' }
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
			return row.hit ? splitMark(row.text, this.name) : [{ text: row.text, mark: false }]
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
