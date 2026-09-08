import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createContentLoader } from 'vitepress'
import { collectionSources } from './search.ts'

export interface Article {
	url: string
	title: string
	category: string
	tags: string[]
	authors: string[]
	updated: string
	description: string
}
declare const data: Article[]
export { data }
const root = fileURLToPath(new URL('../../', import.meta.url))
const categories: Record<string, string> = { campus: '校园', study: '学习', life: '生活', coder: 'Coder' }
function gitDate(paths: string[]) {
	try {
		return execFileSync('git', ['log', '-1', '--format=%cI', '--', ...paths], { cwd: root, encoding: 'utf8' }).trim()
	}
	catch { return '' }
}
const loader = createContentLoader('**/*.md', {
	includeSrc: true,
	transform(pages): Article[] {
		return pages.filter(page => !['/', '/articles'].includes(page.url.replace(/\.html$/, '')) && page.frontmatter.article !== false).map((page) => {
			const fm = page.frontmatter
			const path = `${page.url.replace(/^\//, '').replace(/\.html$/, '')}${page.url.endsWith('/') ? 'index' : ''}.md`
			const dependency = collectionSources[path]
			const updated = fm.updated || gitDate([`docs/${path}`, ...(dependency ? [`docs/.vitepress/data/${dependency}`] : [])])
			const timestamp = Date.parse(String(updated))
			return {
				url: page.url,
				title: fm.title || page.src?.match(/^# +([^ ].*)$/m)?.[1] || page.url,
				category: categories[path.split('/')[0]] || '关于',
				tags: Array.isArray(fm.tags) ? fm.tags : [],
				authors: Array.isArray(fm.author) ? fm.author : fm.author ? [fm.author] : [],
				updated: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '',
				description: fm.description || '',
			}
		}).sort((a, b) => b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title, 'zh-CN'))
	},
})
export default {
	...loader,
	watch: [...loader.watch, '.vitepress/data/*.json'],
	load: () => loader.load(),
}
