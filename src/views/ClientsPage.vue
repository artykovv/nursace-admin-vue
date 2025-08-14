<script setup>
import { ref, onMounted } from 'vue'
import { getCookie } from '../utils/http'

const clients = ref([])
const loading = ref(true)
const error = ref('')

function authHeaders() {
	const token = getCookie('Bearer')
	return token ? { 'Authorization': 'Bearer ' + token } : {}
}

async function fetchOrderCount(sessionId) {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/orders/?session_id=${sessionId}`, { headers: { 'accept': 'application/json', ...authHeaders() } })
		if (!res.ok) return '—'
		const data = await res.json()
		return Array.isArray(data) ? data.length : '—'
	} catch {
		return '—'
	}
}

async function loadClients() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/users/?skip=0&limit=100`, { headers: { 'accept': 'application/json', ...authHeaders() } })
		if (!res.ok) throw new Error('Failed')
		const data = await res.json()
		clients.value = Array.isArray(data) ? data : []
		// fetch order counts in background
		for (const c of clients.value) {
			if (!c) continue
			const count = await fetchOrderCount(c.session_id)
			c._orderCount = count
		}
	} catch (e) {
		error.value = 'Ошибка загрузки клиентов'
	} finally {
		loading.value = false
	}
}

onMounted(loadClients)
</script>

<template>
	<div class="container my-4">
		<div class="d-flex justify-content-between align-items-center mb-3">
			<h1>Клиенты</h1>
		</div>

		<div class="table-responsive">
			<table class="table">
				<thead>
					<tr>
						<th>Почта</th>
						<th>Имя</th>
						<th>Фамилия</th>
						<th>Дата регистрации</th>
						<th>Заказы</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="loading">
						<td colspan="5"><div class="text-center text-muted py-4">Загрузка...</div></td>
					</tr>
					<tr v-else-if="error">
						<td colspan="5"><div class="alert alert-danger mb-0">{{ error }}</div></td>
					</tr>
					<tr v-else-if="clients.length === 0">
						<td colspan="5"><div class="alert alert-info mb-0">Нет клиентов</div></td>
					</tr>
					<tr v-else v-for="client in clients" :key="client.id">
						<td><b>{{ client.email || '' }}</b></td>
						<td>{{ client.name || '' }}</td>
						<td>{{ client.lastname || '' }}</td>
						<td>{{ client.register_at ? new Date(client.register_at).toLocaleString() : '' }}</td>
						<td><span>{{ client._orderCount ?? 'Загрузка…' }}</span></td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<style scoped>
</style> 