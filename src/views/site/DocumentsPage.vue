<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const items = ref([])
const loading = ref(false)
const error = ref('')

function getToken() {
	const m = document.cookie.match(/(?:^|; )Bearer=([^;]*)/)
	return m ? decodeURIComponent(m[1]) : ''
}

async function load() {
	try {
		loading.value = true
		error.value = ''
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/documents/`)
		if (!res.ok) throw new Error()
		items.value = await res.json()
	} catch (e) {
		error.value = 'Ошибка загрузки документов'
		items.value = []
	} finally {
		loading.value = false
	}
}

async function onDelete(id) {
	if (!confirm('Удалить документ?')) return
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/documents/${id}`, {
			method: 'DELETE',
			headers: { 'Authorization': `Bearer ${getToken()}` }
		})
		if (!res.ok) throw new Error()
		items.value = items.value.filter(i => i.id !== id)
	} catch (e) {
		alert('Ошибка при удалении')
	}
}

onMounted(load)
</script>

<template>
	<div class="container mt-4">
		<h1>Документы</h1>
		<div class="d-flex justify-content-between align-items-center mb-3">
			<button class="btn btn-success" @click="router.push('/site/documents/add')">Добавить документ</button>
		</div>
		<div v-if="loading" class="text-muted">Загрузка…</div>
		<div v-else-if="error" class="alert alert-danger">{{ error }}</div>
		<div v-else>
			<div v-if="items.length === 0" class="alert alert-info">Документов нет</div>
			<ul v-else class="list-group">
				<li v-for="doc in items" :key="doc.id" class="list-group-item d-flex justify-content-between align-items-center">
					<span>{{ doc.title }}</span>
					<div class="d-flex gap-2">
						<button class="btn btn-sm btn-warning" @click="router.push(`/site/documents/update/${doc.id}`)">Изменить</button>
						<button class="btn btn-sm btn-danger" @click="onDelete(doc.id)">Удалить</button>
					</div>
				</li>
			</ul>
		</div>
	</div>
</template>

<style scoped>
</style> 