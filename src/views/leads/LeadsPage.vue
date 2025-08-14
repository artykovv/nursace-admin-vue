<script setup>
import { onMounted, ref } from 'vue'

const leads = ref([])
const loading = ref(true)
const error = ref('')

function formatDate(val) {
	if (!val) return ''
	const d = new Date(val)
	if (isNaN(d)) return ''
	const yyyy = d.getFullYear()
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	const hh = String(d.getHours()).padStart(2, '0')
	const min = String(d.getMinutes()).padStart(2, '0')
	const ss = String(d.getSeconds()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
}

async function loadLeads() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/leads/`, { headers: { 'accept': 'application/json' } })
		if (!res.ok) throw new Error('Failed')
		leads.value = await res.json()
	} catch (e) {
		error.value = 'Не удалось загрузить лиды'
	} finally {
		loading.value = false
	}
}

onMounted(loadLeads)
</script>

<template>
	<div class="container my-4">
		<div class="d-flex justify-content-between align-items-center mb-3">
			<h1>Лиды</h1>
			<a href="#" class="btn btn-primary d-flex align-items-center">
				<i class="bi bi-plus-circle me-2"></i>
				Добавить
			</a>
		</div>

		<div v-if="loading" class="text-center text-muted py-5">Загрузка...</div>
		<div v-else>
			<table class="table">
				<thead>
					<tr>
						<th>ФИО</th>
						<th>Телефон</th>
						<th>Статус</th>
						<th>Дата создания</th>
						<th>Действие</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="lead in leads" :key="lead.id">
						<td>
							<router-link class="text-decoration-none" :to="`/leads/${lead.id}`">
								{{ lead.full_name || '' }}
							</router-link>
						</td>
						<td>{{ lead.phone_number || '' }}</td>
						<td>{{ (lead.status && lead.status.name) ? lead.status.name : '' }}</td>
						<td>{{ formatDate(lead.created_at) }}</td>
						<td>
							<router-link class="btn btn-sm btn-primary" :to="`/leads/${lead.id}`">
								Открыть
							</router-link>
						</td>
					</tr>
				</tbody>
			</table>
			<div v-if="!leads.length" class="text-muted">Пусто</div>
		</div>

		<div v-if="error" class="alert alert-danger mt-3" role="alert">{{ error }}</div>
	</div>
</template>

<style scoped>
</style> 