<script setup>
import { ref, computed, onMounted } from 'vue'

const orders = ref([])
const statuses = ref([])
const loading = ref(true)
const error = ref('')

const sortField = ref('id') // id | date | price
const sortDir = ref('desc') // asc | desc

const statusMap = computed(() => {
	const map = {}
	for (const s of statuses.value || []) map[s.id] = s
	return map
})

const sortedOrders = computed(() => {
	const data = [...(orders.value || [])]
	data.sort((a, b) => {
		let av, bv
		if (sortField.value === 'id') { av = a.id; bv = b.id }
		else if (sortField.value === 'date') { av = new Date(a.created_at); bv = new Date(b.created_at) }
		else if (sortField.value === 'price') { av = parseFloat(a.total_price); bv = parseFloat(b.total_price) }
		else { av = a[sortField.value]; bv = b[sortField.value] }
		if (av < bv) return sortDir.value === 'asc' ? -1 : 1
		if (av > bv) return sortDir.value === 'asc' ? 1 : -1
		return 0
	})
	return data
})

function toggleSort(field) {
	if (sortField.value === field) {
		sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
	} else {
		sortField.value = field
		sortDir.value = 'desc'
	}
}

async function loadData() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const [ordersRes, statusesRes] = await Promise.all([
			fetch(`${siteUrl}/orders/`, { headers: { 'accept': 'application/json' } }),
			fetch(`${siteUrl}/orders/statuses/`, { headers: { 'accept': 'application/json' } })
		])
		orders.value = await ordersRes.json()
		statuses.value = await statusesRes.json()
	} catch (e) {
		error.value = 'Ошибка загрузки заказов'
	} finally {
		loading.value = false
	}
}

onMounted(loadData)
</script>

<template>
	<div class="container my-4">
		<div class="d-flex justify-content-between align-items-center mb-3">
			<h1>Заказы</h1>
			<a href="#" class="btn btn-primary d-flex align-items-center">
				<i class="bi bi-plus-circle me-2"></i>
				Добавить
			</a>
		</div>

		<div class="table-responsive">
			<table class="table">
				<thead>
					<tr>
						<th>Заказ</th>
						<th>Клиент</th>
						<th>Дата</th>
						<th>Статус</th>
						<th>Итог</th>
						<th>Действие</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="loading">
						<td colspan="5"><div class="text-center text-muted py-4">Загрузка...</div></td>
					</tr>
					<tr v-else-if="error">
						<td colspan="5"><div class="alert alert-danger mb-0">{{ error }}</div></td>
					</tr>
					<tr v-else-if="sortedOrders.length === 0">
						<td colspan="5"><div class="alert alert-info mb-0">Нет заказов</div></td>
					</tr>
					<tr v-else v-for="order in sortedOrders" :key="order.id">
						<td><b>#{{ order.id }}</b></td>
						<td>{{ order.info?.first_name || '' }} {{ order.info?.last_name || '' }}</td>
						<td>{{ order.created_at ? new Date(order.created_at).toLocaleString() : '' }}</td>
						<td>{{ (statusMap[order.status_id]?.description) || (statusMap[order.status_id]?.name) || order.status_id || '' }}</td>
						<td><b>{{ order.total_price }}</b></td>
						<td>
							<router-link class="btn btn-sm btn-primary" :to="`/orders/${order.id}`">Открыть</router-link>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<style scoped>
</style> 