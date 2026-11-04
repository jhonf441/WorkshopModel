'use strict'

// One shared Intl.Collator per ordering. `String.prototype.localeCompare(b, undefined, options)` builds a new collator on every
// call, which made sorting the ~4500 leaves of the Flat list take ~700 ms each second; the shared one takes ~30 ms.
const base = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
const plain = new Intl.Collator(undefined, { numeric: true })

// natural order (file2 before file10), letters compared without case or accents
export const naturalCompare = (a, b) => base.compare(String(a), String(b))

// natural order that still tells apart letters that differ only by case or accent
export const numericCompare = (a, b) => plain.compare(String(a), String(b))
