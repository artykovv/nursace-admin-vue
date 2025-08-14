<script setup>
import { onMounted, ref } from 'vue'
import { apiFetch, getCookie } from '../utils/http'

const loading = ref(true)
const error = ref('')
const todayOrders = ref({ orders_count: 0, total_sum: 0 })
const leadsByStatus = ref([])
const topProducts = ref([])
const clientsStats = ref({ registered_clients: 0, unregistered_clients: 0 })

async function loadData() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const token = getCookie('Bearer')
		const today = new Date().toISOString().split('T')[0]

		const [ordersRes, leadsRes, productsRes, clientsRes] = await Promise.all([
			fetch(`${siteUrl}/mini/report/report?start_date=${today}&end_date=${today}`, { headers: { 'accept': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) } }),
			fetch(`${siteUrl}/mini/report/leads-by-status?start_date=${today}&end_date=${today}`, { headers: { 'accept': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) } }),
			fetch(`${siteUrl}/mini/report/top-products`, { headers: { 'accept': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) } }),
			fetch(`${siteUrl}/mini/report/clients`, { headers: { 'accept': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) } })
		])

		const [ordersData, leadsData, productsData, clientsData] = await Promise.all([
			ordersRes.json(), leadsRes.json(), productsRes.json(), clientsRes.json()
		])

		todayOrders.value = ordersData?.[0] || { orders_count: 0, total_sum: 0 }
		leadsByStatus.value = Array.isArray(leadsData) ? leadsData : []
		topProducts.value = Array.isArray(productsData) ? productsData.slice(0, 5) : []
		clientsStats.value = clientsData || { registered_clients: 0, unregistered_clients: 0 }
	} catch (e) {
		error.value = 'Ошибка загрузки данных'
	} finally {
		loading.value = false
	}
}

onMounted(loadData)
</script>

<template>
	<div class="container my-4">
		<h1 class="mb-4">Главная</h1>

		<div class="row g-4">
			<div class="col-md-4">
				<div class="card h-100 shadow-sm">
					<div class="card-header bg-white d-flex align-items-center">
						<i class="bi bi-bag-check-fill me-2 text-secondary"></i>
						Заказы за сегодня
					</div>
					<div class="card-body text-center">
						<div v-if="loading" class="text-muted">Загрузка...</div>
						<div v-else>
							<div class="mb-2 fs-4 text-primary">{{ todayOrders.orders_count }}</div>
							<div class="mb-3 text-muted">Количество заказов</div>
							<div class="mb-2 fs-4 text-success">{{ todayOrders.total_sum }}</div>
							<div class="text-muted">Сумма заказов</div>
						</div>
					</div>
				</div>
			</div>

			<div class="col-md-4">
				<div class="card h-100 shadow-sm">
					<div class="card-header bg-white d-flex align-items-center">
						<i class="bi bi-person-lines-fill me-2 text-secondary"></i>
						Лиды по статусам
					</div>
					<div class="card-body">
						<div v-if="loading" class="text-center text-muted">Загрузка...</div>
						<div v-else>
							<div class="text-center mb-2 fs-5 text-success">{{ leadsByStatus.reduce((a, r) => a + (r.lead_count || 0), 0) }}</div>
							<div class="text-center text-muted mb-3">Количество лидов</div>
							<ul class="list-group list-group-flush">
								<li v-for="row in leadsByStatus" :key="row.status" class="list-group-item d-flex justify-content-between align-items-center">
									<span>{{ row.status }}</span>
									<span class="badge bg-secondary rounded-pill">{{ row.lead_count }}</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>

			<div class="col-md-4">
				<div class="card h-100 shadow-sm">
					<div class="card-header bg-white d-flex align-items-center">
						<i class="bi bi-people me-2 text-secondary"></i>
						Клиенты
					</div>
					<div class="card-body text-center">
						<div v-if="loading" class="text-muted">Загрузка...</div>
						<div v-else>
							<div class="mb-2 fs-4 text-info">{{ clientsStats.registered_clients }}</div>
							<div class="text-muted mb-2">Зарегистрированные</div>
							<div class="mb-2 fs-4 text-secondary">{{ clientsStats.unregistered_clients }}</div>
							<div class="text-muted">Незарегистрированные</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="row g-4 mt-1">
			<div class="col-12">
				<div class="card shadow-sm">
					<div class="card-header bg-white d-flex align-items-center">
						<i class="bi bi-star me-2 text-secondary"></i>
						Топ-5 товаров
					</div>
					<div class="card-body">
						<div v-if="loading" class="text-center text-muted">Загрузка...</div>
						<div v-else>
							<ul class="list-group list-group-flush">
								<li v-for="row in topProducts" :key="row.product_name" class="list-group-item d-flex justify-content-between align-items-center">
									<span>{{ row.product_name }}</span>
									<span class="badge bg-primary rounded-pill">{{ row.total_quantity }}</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="mt-4 text-center">
			<router-link to="/report" class="btn btn-outline-primary">
				<i class="bi bi-bar-chart-line me-2"></i>
				Детальный отчет
			</router-link>
		</div>

		<div v-if="error" class="alert alert-danger mt-4" role="alert">{{ error }}</div>
	</div>
</template>

<style scoped>
</style> 