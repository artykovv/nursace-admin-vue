<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const leadId = route.params.id

const loading = ref(true)
const error = ref('')
const lead = ref(null)

function formatDate(val) {
	if (!val) return 'Не указано'
	const d = new Date(val)
	if (isNaN(d)) return 'Не указано'
	const yyyy = d.getFullYear()
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	const hh = String(d.getHours()).padStart(2, '0')
	const min = String(d.getMinutes()).padStart(2, '0')
	const ss = String(d.getSeconds()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
}

async function loadLead() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/leads/${leadId}`, { headers: { 'accept': 'application/json' } })
		if (!res.ok) throw new Error('Failed')
		lead.value = await res.json()
	} catch (e) {
		error.value = 'Ошибка при загрузке данных лида'
	} finally {
		loading.value = false
	}
}

onMounted(loadLead)
</script>

<template>
	<div class="container my-4">
		<div class="d-flex justify-content-between align-items-center mb-3">
			<h1>Детали лида</h1>
			<router-link to="/leads" class="btn btn-secondary">
				<i class="bi bi-arrow-left me-2"></i>
				Назад к списку
			</router-link>
		</div>

		<div v-if="loading" class="text-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Загрузка...</span>
			</div>
		</div>

		<div v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

		<div v-else>
			<div class="row">
				<div class="col-md-6">
					<div class="card">
						<div class="card-header">
							<h5 class="card-title mb-0">Основная информация</h5>
						</div>
						<div class="card-body">
							<table class="table table-borderless mb-0">
								<tr>
									<td><strong>ID:</strong></td>
									<td>{{ lead?.id || '' }}</td>
								</tr>
								<tr>
									<td><strong>ФИО:</strong></td>
									<td>{{ lead?.full_name || 'Не указано' }}</td>
								</tr>
								<tr>
									<td><strong>Телефон:</strong></td>
									<td>{{ lead?.phone_number || 'Не указано' }}</td>
								</tr>
								<tr>
									<td><strong>Статус:</strong></td>
									<td>{{ (lead?.status && lead.status.name) ? lead.status.name : 'Не указано' }}</td>
								</tr>
								<tr>
									<td><strong>Дата создания:</strong></td>
									<td>{{ formatDate(lead?.created_at) }}</td>
								</tr>
							</table>
						</div>
					</div>
				</div>
				<div class="col-md-6">
					<div class="card">
						<div class="card-header">
							<h5 class="card-title mb-0">Комментарий</h5>
						</div>
						<div class="card-body">
							<p class="mb-0">{{ lead?.comment || 'Комментарий отсутствует' }}</p>
						</div>
					</div>

					<div class="card mt-3">
						<div class="card-header">
							<h5 class="card-title mb-0">Товары</h5>
						</div>
						<div class="card-body">
							<div v-if="!lead?.products || lead.products.length === 0" class="text-muted">Товары не указаны</div>
							<ul v-else class="list-group list-group-flush">
								<li v-for="(item, idx) in lead.products" :key="idx" class="list-group-item">
									<div><strong>{{ item.product?.good_name || 'Без названия' }}</strong></div>
									<div v-if="item.product?.articul">Артикул: {{ item.product.articul }}</div>
									<div v-if="item.quantity">Кол-во: {{ item.quantity }}</div>
									<div v-if="item.product?.retail_price_with_discount || item.product?.retail_price">Цена: {{ item.product?.retail_price_with_discount || item.product?.retail_price }}</div>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
</style> 