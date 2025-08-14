<script setup>
import { ref } from 'vue'

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

async function onSubmit() {
	if (loading.value) return
	loading.value = true
	error.value = ''
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/documents/`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${getToken()}`,
				'Accept': 'application/json'
			},
			body: JSON.stringify({ title: title.value, slug: slug.value, is_active: isActive.value, content: content.value })
		})
		if (!res.ok) throw new Error('Ошибка добавления')
		history.back()
	} catch (e) {
		error.value = 'Ошибка добавления документа'
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="container mt-4">
		<h1>Добавить документ</h1>
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
			<button type="submit" class="btn btn-success" :disabled="loading">{{ loading ? 'Сохранение…' : 'Сохранить' }}</button>
		</form>
	</div>
</template>

<style scoped>
</style> 