<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getCookie } from '../../utils/http'

const route = useRoute()
const orderId = route.params.id

const loading = ref(true)
const error = ref('')
const order = ref(null)
const statuses = ref([])

function authHeaders() {
	const token = getCookie('Bearer')
	return token ? { 'Authorization': 'Bearer ' + token } : {}
}

async function loadData() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const orderRes = await fetch(`${siteUrl}/orders/${orderId}`, { headers: { 'accept': 'application/json', ...authHeaders() } })
		if (!orderRes.ok) throw new Error('Failed')
		order.value = await orderRes.json()
		const statusesRes = await fetch(`${siteUrl}/orders/statuses/`, { headers: { 'accept': 'application/json', ...authHeaders() } })
		statuses.value = await statusesRes.json()
	} catch (e) {
		error.value = 'Ошибка загрузки заказа'
	} finally {
		loading.value = false
	}
}

function statusText(id) {
	const s = (statuses.value || []).find(x => x.id === id)
	return s?.description || s?.name || id
}

onMounted(loadData)
</script>

<template>
	<div class="container my-4">
		<div class="mb-3">
			<router-link to="/orders" class="btn btn-link">&larr; К списку заказов</router-link>
		</div>
		<h2>Заказ #{{ orderId }}</h2>
		<div v-if="loading" class="text-center text-muted py-4">Загрузка...</div>
		<div v-else-if="error" class="alert alert-danger">{{ error }}</div>
		<div v-else-if="!order" class="alert alert-danger">Заказ не найден</div>
		<div v-else>
			<div class="row mb-3">
				<div class="col-md-6">
					<h5>Покупатель</h5>
					<div><b>{{ order.info?.first_name || '' }} {{ order.info?.last_name || '' }}</b></div>
					<div>{{ order.info?.address_line1 || '' }}</div>
					<div>{{ order.info?.city || '' }}<template v-if="order.info?.region">, {{ order.info.region }}</template></div>
					<div>{{ order.info?.phone || '' }}</div>
				</div>
				<div class="col-md-6">
					<h5>Информация о заказе</h5>
					<div>Создан: {{ order.created_at ? new Date(order.created_at).toLocaleString() : '' }}</div>
					<div>Статус: <span>{{ statusText(order.status_id) }}</span></div>
					<div>Сумма: <b>{{ order.total_price }}</b></div>
					<router-link class="btn btn-warning mt-2" :to="`/orders/${order.id}/update`">Изменить</router-link>
				</div>
			</div>
			<h5>Товары</h5>
			<div class="table-responsive">
				<table class="table table-bordered">
					<thead>
						<tr><th>ID</th><th>Товар</th><th>Кол-во</th><th>Цена</th></tr>
					</thead>
					<tbody>
						<tr v-for="(item, idx) in order.items || []" :key="idx">
							<td>{{ item.product_id }}</td>
							<td>{{ item.product?.good_name || '-' }}</td>
							<td>{{ item.quantity }}</td>
							<td>{{ item.price }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<style scoped>
</style> 