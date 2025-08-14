<script setup>
import { ref, onMounted } from 'vue'
import { getCookie } from '../utils/http'

const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const error = ref('')
const summary = ref([])
const details = ref([])

function authHeaders() {
	const token = getCookie('Bearer')
	return token ? { 'Authorization': 'Bearer ' + token } : {}
}

function setToday() {
	const today = new Date().toISOString().split('T')[0]
	startDate.value = today
	endDate.value = today
}

async function loadReport() {
	if (!startDate.value || !endDate.value) return
	loading.value = true
	error.value = ''
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const [summaryRes, detailsRes] = await Promise.all([
			fetch(`${siteUrl}/mini/report/report?start_date=${startDate.value}&end_date=${endDate.value}&sort_by=date&sort_order=asc`, { headers: { 'accept': 'application/json', ...authHeaders() } }),
			fetch(`${siteUrl}/report/order/details?start_date=${startDate.value}&end_date=${endDate.value}`, { headers: { 'accept': 'application/json', ...authHeaders() } })
		])
		summary.value = await summaryRes.json()
		details.value = await detailsRes.json()
	} catch (e) {
		error.value = 'Ошибка загрузки отчета'
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	setToday()
	loadReport()
})
</script>

<template>
	<div class="container my-4">
		<h1>Отчет по заказам</h1>
		<form class="row g-3 mb-4" @submit.prevent="loadReport">
			<div class="col-auto">
				<label class="form-label">Дата начала</label>
				<input type="date" class="form-control" v-model="startDate" required />
			</div>
			<div class="col-auto">
				<label class="form-label">Дата конца</label>
				<input type="date" class="form-control" v-model="endDate" required />
			</div>
			<div class="col-auto align-self-end">
				<button type="submit" class="btn btn-primary" :disabled="loading">
					<span v-if="!loading">Показать отчет</span>
					<span v-else>Загрузка…</span>
				</button>
			</div>
		</form>

		<div v-if="error" class="alert alert-danger">{{ error }}</div>

		<h3>Сводка по дням</h3>
		<div class="table-responsive">
			<table class="table">
				<thead>
					<tr>
						<th>Дата</th>
						<th>Количество заказов</th>
						<th>Сумма</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="loading">
						<td colspan="3" class="text-center text-muted py-3">Загрузка...</td>
					</tr>
					<tr v-else-if="!summary.length">
						<td colspan="3" class="text-muted">Нет данных</td>
					</tr>
					<tr v-else v-for="row in summary" :key="row.date">
						<td>{{ row.date }}</td>
						<td>{{ row.orders_count }}</td>
						<td>{{ row.total_sum }}</td>
					</tr>
				</tbody>
			</table>
		</div>

		<h3>Детали заказов</h3>
		<div class="table-responsive">
			<table class="table">
				<thead>
					<tr>
						<th>ID заказа</th>
						<th>Клиент</th>
						<th>Email</th>
						<th>Сумма</th>
						<th>Дата создания</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="loading">
						<td colspan="5" class="text-center text-muted py-3">Загрузка...</td>
					</tr>
					<tr v-else-if="!details.length">
						<td colspan="5" class="text-muted">Нет данных</td>
					</tr>
					<tr v-else v-for="row in details" :key="row.order_id">
						<td>{{ row.order_id }}</td>
						<td>{{ row.client }}</td>
						<td>{{ row.email }}</td>
						<td>{{ row.total_price }}</td>
						<td>{{ row.created_at ? new Date(row.created_at).toLocaleString() : '' }}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<style scoped>
</style> 