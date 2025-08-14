<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const name = ref('')
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
		const res = await fetch(`${siteUrl}/custom-categories/`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${getToken()}`,
				'Accept': 'application/json'
			},
			body: JSON.stringify({ category_name: name.value })
		})
		if (!res.ok) throw new Error()
		router.push('/site/categories')
	} catch (e) {
		error.value = 'Ошибка добавления категории'
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="container mt-4">
		<h1>Добавить категорию</h1>
		<div v-if="error" class="alert alert-danger">{{ error }}</div>
		<form @submit.prevent="onSubmit">
			<div class="mb-3">
				<label class="form-label">Название</label>
				<input v-model="name" type="text" class="form-control" required />
			</div>
			<button type="submit" class="btn btn-success" :disabled="loading">{{ loading ? 'Сохранение…' : 'Сохранить' }}</button>
		</form>
	</div>
</template>

<style scoped>
</style> 