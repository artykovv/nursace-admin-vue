<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const items = ref([])
const loading = ref(false)
const error = ref('')

// Create modal
const showCreate = ref(false)
const createForm = ref({ name: '' })

function getToken() {
	const m = document.cookie.match(/(?:^|; )Bearer=([^;]*)/)
	return m ? decodeURIComponent(m[1]) : ''
}

async function load() {
	try {
		loading.value = true
		error.value = ''
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/custom-categories/`)
		if (!res.ok) throw new Error()
		items.value = await res.json()
	} catch (e) {
		error.value = 'Ошибка загрузки категорий'
		items.value = []
	} finally {
		loading.value = false
	}
}

async function onCreate() {
	if (!createForm.value.name.trim()) return
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/custom-categories/`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${getToken()}`,
				'Accept': 'application/json'
			},
			body: JSON.stringify({ category_name: createForm.value.name })
		})
		if (!res.ok) throw new Error()
		showCreate.value = false
		createForm.value.name = ''
		await load()
	} catch (e) {
		alert('Ошибка добавления категории')
	}
}

async function onDelete(id) {
	if (!confirm('Удалить категорию?')) return
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/custom-categories/${id}`, {
			method: 'DELETE',
			headers: { 'Authorization': `Bearer ${getToken()}` }
		})
		if (!res.ok) throw new Error()
		items.value = items.value.filter(i => i.category_id !== id)
	} catch (e) {
		alert('Ошибка при удалении категории')
	}
}

onMounted(load)
</script>

<template>
	<div class="container mt-4">
		<h1>Категории</h1>
		<div class="d-flex justify-content-between align-items-center mb-3">
			<button class="btn btn-success" @click="showCreate = true">Добавить категорию</button>
		</div>
		<div v-if="loading" class="text-muted">Загрузка…</div>
		<div v-else-if="error" class="alert alert-danger">{{ error }}</div>
		<div v-else>
			<div v-if="items.length === 0" class="alert alert-info">Категорий нет</div>
			<ul v-else class="list-group">
				<li v-for="c in items" :key="c.category_id" class="list-group-item d-flex justify-content-between align-items-center">
					<span>{{ c.category_name }}</span>
					<div class="d-flex gap-2">
						<button class="btn btn-sm btn-primary" @click="router.push(`/site/categories/${c.category_id}/products`)">Товары</button>
						<button class="btn btn-sm btn-danger" @click="onDelete(c.category_id)">Удалить</button>
					</div>
				</li>
			</ul>
		</div>

		<!-- Create Modal -->
		<div v-if="showCreate" class="modal fade show d-block" tabindex="-1">
			<div class="modal-backdrop show"></div>
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Новая категория</h5>
						<button type="button" class="btn-close" @click="showCreate = false"></button>
					</div>
					<div class="modal-body">
						<form @submit.prevent="onCreate">
							<div class="mb-3">
								<label class="form-label">Название</label>
								<input v-model="createForm.name" type="text" class="form-control" required />
							</div>
						</form>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" @click="showCreate = false">Закрыть</button>
						<button type="button" class="btn btn-primary" @click="onCreate">Сохранить</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.modal.show {
	display: block !important;
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	z-index: 1050;
}

.modal-backdrop.show {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.5);
	opacity: 1;
	z-index: 1040;
}

.modal-dialog { position: relative; z-index: 1055; }
.modal-content { position: relative; z-index: 1056; }
</style> 