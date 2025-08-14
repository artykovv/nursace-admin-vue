<script setup>
import { ref, computed, onMounted } from 'vue'

const items = ref([])
const loading = ref(false)
const error = ref('')
const offset = ref(0)
const limit = ref(20)
const hasImage = ref('') // '', 'true', 'false'
const q = ref('')
const sortField = ref('id') // id | name | price
const sortDir = ref('desc')

const canLoadMore = ref(true)

function mainImage(product) {
	const imgs = product?.images || []
	return imgs.find(i => i.is_main) || imgs[0] || null
}

function applyHasImageFilter(val) {
	hasImage.value = val === null ? '' : (val ? 'true' : 'false')
	resetAndLoad()
}

const filteredSorted = computed(() => {
	let data = [...items.value]
	// client side sort
	data.sort((a, b) => {
		let av, bv
		if (sortField.value === 'id') { av = a.good_id; bv = b.good_id }
		else if (sortField.value === 'name') { av = (a.good_name || a.fashion_name || '').toLowerCase(); bv = (b.good_name || b.fashion_name || '').toLowerCase() }
		else if (sortField.value === 'price') { av = Number(a.retail_price_with_discount ?? a.retail_price); bv = Number(b.retail_price_with_discount ?? b.retail_price) }
		else { av = a[sortField.value]; bv = b[sortField.value] }
		if (av < bv) return sortDir.value === 'asc' ? -1 : 1
		if (av > bv) return sortDir.value === 'asc' ? 1 : -1
		return 0
	})
	return data
})

function resetAndLoad() {
	offset.value = 0
	items.value = []
	canLoadMore.value = true
	loadMore()
}

async function loadMore() {
	if (!canLoadMore.value || loading.value) return
	loading.value = true
	error.value = ''
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const params = new URLSearchParams({ limit: String(limit.value), offset: String(offset.value) })
		if (q.value.trim()) params.set('search', q.value.trim())
		if (hasImage.value) params.set('has_image', hasImage.value)
		const res = await fetch(`${siteUrl}/products/?${params.toString()}`, { headers: { 'accept': 'application/json' } })
		if (!res.ok) throw new Error('Failed')
		const data = await res.json()
		const batch = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
		if (batch.length < limit.value) canLoadMore.value = false
		items.value = items.value.concat(batch)
		offset.value += limit.value
	} catch (e) {
		error.value = 'Ошибка загрузки товаров'
		canLoadMore.value = false
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	resetAndLoad()
})
</script>

<template>
	<div class="container my-4">
		<div class="d-flex justify-content-between align-items-center mb-3">
			<h1>Товары</h1>
		</div>

		<div class="card mb-3">
			<div class="card-header d-flex flex-wrap gap-2 align-items-center justify-content-between">
				<div class="d-flex gap-2 align-items-center">
					<div class="input-group input-group-sm" style="min-width: 280px;">
						<span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
						<input v-model="q" @keydown.enter.prevent="resetAndLoad" type="text" class="form-control" placeholder="Поиск (название, артикул)" />
						<button class="btn btn-outline-primary" @click="resetAndLoad">Найти</button>
					</div>
					<select class="form-select form-select-sm w-auto" v-model="limit" @change="resetAndLoad">
						<option :value="20">20</option>
						<option :value="50">50</option>
						<option :value="100">100</option>
					</select>
					<select class="form-select form-select-sm w-auto" v-model="hasImage" @change="resetAndLoad">
						<option value="">Все</option>
						<option value="true">С фото</option>
						<option value="false">Без фото</option>
					</select>
				</div>
				<div class="d-flex gap-2 align-items-center">
					<label class="mb-0 small text-muted">Сортировать</label>
					<select class="form-select form-select-sm w-auto" v-model="sortField">
						<option value="id">ID</option>
						<option value="name">Название</option>
						<option value="price">Цена</option>
					</select>
					<div class="btn-group btn-group-sm" role="group">
						<button type="button" class="btn" :class="sortDir==='asc' ? 'btn-primary' : 'btn-outline-primary'" @click="sortDir='asc'">Возр.</button>
						<button type="button" class="btn" :class="sortDir==='desc' ? 'btn-primary' : 'btn-outline-primary'" @click="sortDir='desc'">Убыв.</button>
					</div>
				</div>
			</div>
			<div class="card-body p-0">
				<div class="table-responsive">
					<table class="table align-middle mb-0">
						<thead>
							<tr>
								<th>Фото</th>
								<th>Название</th>
								<th>Размер</th>
								<th>В наличии</th>
								<th class="text-end">Цена</th>
								<th>Действие</th>
							</tr>
						</thead>
						<tbody>
							<tr v-if="items.length === 0 && loading">
								<td colspan="6" class="text-center text-muted py-4">Загрузка...</td>
							</tr>
							<tr v-else-if="items.length === 0 && !loading">
								<td colspan="6" class="text-center text-muted py-4">Нет товаров</td>
							</tr>
							<tr v-else v-for="p in filteredSorted" :key="p.good_id">
								<td class="align-middle text-center" style="max-width:90px;">
									<div class="ratio ratio-1x1 w-100" style="max-width:90px;" @click.stop="applyHasImageFilter(!!mainImage(p))">
										<template v-if="mainImage(p)">
											<img :src="mainImage(p).image_url" class="object-fit-cover rounded" :alt="p.good_name || p.fashion_name || ''" style="max-width:80px;max-height:80px;" />
										</template>
										<template v-else>
											<div class="d-flex align-items-center justify-content-center h-100 text-muted">Нет фото</div>
										</template>
									</div>
								</td>
								<td class="align-middle">
									<div class="fw-bold">{{ p.good_name || p.fashion_name || '' }}</div>
									<div class="text-muted small">Артикул: <b>{{ p.articul || '' }}</b></div>
								</td>
								<td class="align-middle">{{ p.product_size || '' }}</td>
								<td class="align-middle">{{ p.warehouse_quantity ?? 0 }}</td>
								<td class="align-middle text-end">
									<span class="fw-bold">
										<template v-if="p.retail_price_with_discount && p.retail_price_with_discount != p.retail_price">
											<span class="text-danger">{{ p.retail_price_with_discount }}</span>
											<span class="text-decoration-line-through text-muted small ms-1">{{ p.retail_price }}</span>
										</template>
										<template v-else>{{ p.retail_price }}</template>
									</span>
								</td>
								<td class="align-middle">
									<router-link class="btn btn-sm btn-primary" :to="`/products/${p.good_id}`">Открыть</router-link>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<div class="d-flex justify-content-center align-items-center mt-3" v-if="canLoadMore">
			<button class="btn btn-outline-primary" @click="loadMore" :disabled="loading">{{ loading ? 'Загрузка…' : 'Загрузить еще' }}</button>
		</div>

		<div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
	</div>
</template>

<style scoped>
</style> 