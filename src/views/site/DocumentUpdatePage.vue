<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const title = ref('')
const slug = ref('')
const isActive = ref(false)
const content = ref('')
const loading = ref(false)
const error = ref('')

function getToken() {
	const m = document.cookie.match(/(?:^|; )Bearer=([^;]*)/)
	return m ? decodeURIComponent(m[1]) : ''
}

async function loadDoc() {
	try {
		loading.value = true
		error.value = ''
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/documents/${route.params.id}`)
		if (!res.ok) throw new Error()
		const doc = await res.json()
		title.value = doc.title || ''
		slug.value = doc.slug || ''
		isActive.value = !!doc.is_active
		content.value = doc.content || ''
	} catch (e) {
		error.value = 'Ошибка загрузки документа'
	} finally {
		loading.value = false
	}
}

async function onSubmit() {
	if (loading.value) return
	loading.value = true
	error.value = ''
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/documents/${route.params.id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${getToken()}`,
				'Accept': 'application/json'
			},
			body: JSON.stringify({ title: title.value, slug: slug.value, is_active: isActive.value, content: content.value })
		})
		if (!res.ok) throw new Error('Ошибка сохранения')
		router.push('/site/documents')
	} catch (e) {
		error.value = 'Ошибка сохранения'
	} finally {
		loading.value = false
	}
}

onMounted(loadDoc)
</script>

<template>
	<div class="container mt-4">
		<h1>Изменить документ</h1>
		<div v-if="error" class="alert alert-danger">{{ error }}</div>
		<form @submit.prevent="onSubmit">
			<div class="mb-3">
				<label class="form-label">Название</label>
				<input v-model="title" type="text" class="form-control" required />
			</div>
			<div class="mb-3">
				<label class="form-label">Slug</label>
				<input v-model="slug" type="text" class="form-control" required />
			</div>
			<div class="form-check mb-3">
				<input v-model="isActive" class="form-check-input" type="checkbox" id="doc-active">
				<label class="form-check-label" for="doc-active">Активен</label>
			</div>
			<div class="mb-3">
				<label class="form-label">Текст документа</label>
				<textarea v-model="content" class="form-control" rows="10" required></textarea>
			</div>
			<button type="submit" class="btn btn-primary" :disabled="loading">{{ loading ? 'Сохранение…' : 'Сохранить' }}</button>
		</form>
	</div>
</template>

<style scoped>
</style> 