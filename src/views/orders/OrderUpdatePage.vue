<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCookie } from '../../utils/http'

const route = useRoute()
const router = useRouter()
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
		const [orderRes, statusesRes] = await Promise.all([
			fetch(`${siteUrl}/orders/${orderId}`, { headers: { 'accept': 'application/json', ...authHeaders() } }),
			fetch(`${siteUrl}/orders/statuses/`, { headers: { 'accept': 'application/json', ...authHeaders() } })
		])
		if (!orderRes.ok) throw new Error('Failed')
		order.value = await orderRes.json()
		statuses.value = await statusesRes.json()
	} catch (e) {
		error.value = 'Ошибка загрузки заказа'
	} finally {
		loading.value = false
	}
}

async function onSubmit(e) {
	e.preventDefault()
	if (!order.value) return
	const fd = new FormData(e.target)
	const siteUrl = window.AppConfig?.siteUrl || ''
	try {
		const infoPayload = {
			user_id: order.value.user_id,
			first_name: fd.get('first_name'),
			last_name: fd.get('last_name'),
			address_line1: fd.get('address_line1'),
			city: fd.get('city'),
			region: fd.get('region'),
			postal_code: fd.get('postal_code'),
			phone: fd.get('phone'),
			order_note: fd.get('order_note')
		}
		await fetch(`${siteUrl}/orders/info/${order.value.info_id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', ...authHeaders() },
			body: JSON.stringify(infoPayload)
		})
		const orderPayload = {
			user_id: order.value.user_id,
			session_id: order.value.session_id,
			total_price: Number(fd.get('total_price')),
			status_id: Number(fd.get('status_id')),
			info_id: order.value.info_id
		}
		await fetch(`${siteUrl}/orders/${orderId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', ...authHeaders() },
			body: JSON.stringify(orderPayload)
		})
		router.push(`/orders/${orderId}`)
	} catch (e) {
		error.value = 'Ошибка при сохранении'
	}
}

onMounted(loadData)
</script>

<template>
	<div class="container my-4">
		<div class="mb-3">
			<router-link :to="`/orders/${orderId}`" class="btn btn-link">&larr; К заказу</router-link>
		</div>
		<h2>Изменить заказ #{{ orderId }}</h2>
		<div v-if="loading" class="text-center text-muted py-4">Загрузка...</div>
		<div v-else-if="error" class="alert alert-danger">{{ error }}</div>
		<div v-else-if="!order" class="alert alert-danger">Заказ не найден</div>
		<div v-else>
			<form class="mt-4" @submit="onSubmit">
				<h5>Редактировать заказ</h5>
				<div class="row">
					<div class="col-md-6">
						<div class="mb-2">
							<label class="form-label">Имя</label>
							<input type="text" class="form-control" name="first_name" :value="order.info?.first_name || ''">
						</div>
						<div class="mb-2">
							<label class="form-label">Фамилия</label>
							<input type="text" class="form-control" name="last_name" :value="order.info?.last_name || ''">
						</div>
						<div class="mb-2">
							<label class="form-label">Адрес</label>
							<input type="text" class="form-control" name="address_line1" :value="order.info?.address_line1 || ''">
						</div>
						<div class="mb-2">
							<label class="form-label">Город</label>
							<input type="text" class="form-control" name="city" :value="order.info?.city || ''">
						</div>
						<div class="mb-2">
							<label class="form-label">Регион</label>
							<input type="text" class="form-control" name="region" :value="order.info?.region || ''">
						</div>
						<div class="mb-2">
							<label class="form-label">Почтовый код</label>
							<input type="text" class="form-control" name="postal_code" :value="order.info?.postal_code || ''">
						</div>
						<div class="mb-2">
							<label class="form-label">Телефон</label>
							<input type="text" class="form-control" name="phone" :value="order.info?.phone || ''">
						</div>
						<div class="mb-2">
							<label class="form-label">Комментарий</label>
							<input type="text" class="form-control" name="order_note" :value="order.info?.order_note || ''">
						</div>
					</div>
					<div class="col-md-6">
						<div class="mb-2">
							<label class="form-label">Статус</label>
							<select class="form-select" name="status_id" :value="order.status_id">
								<option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.description || s.name }}</option>
							</select>
						</div>
						<div class="mb-2">
							<label class="form-label">Сумма</label>
							<input type="number" class="form-control" name="total_price" :value="order.total_price">
						</div>
					</div>
				</div>
				<button type="submit" class="btn btn-success mt-3">Сохранить</button>
				<router-link :to="`/orders/${order.id}`" class="btn btn-secondary mt-3 ms-2">Отмена</router-link>
			</form>
		</div>
	</div>
</template>

<style scoped>
</style> 