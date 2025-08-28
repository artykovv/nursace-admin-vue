<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const categoryId = route.params.id

const items = ref([])
const loading = ref(false)
const error = ref('')
const sortField = ref('id')
const sortDir = ref('desc')

function mainImage(product) {
	const imgs = product?.images || []
	return imgs.find(i => i.is_main) || imgs[0] || null
}

const sortedItems = computed(() => {
	const data = [...items.value]
	data.sort((a, b) => {
		let av, bv
		if (sortField.value === 'id') { av = a.good_id; bv = b.good_id }
		else if (sortField.value === 'name') { av = (a.fashion_name || '').toLowerCase(); bv = (b.fashion_name || '').toLowerCase() }
		else if (sortField.value === 'price') { av = Number(a.retail_price_with_discount ?? a.retail_price); bv = Number(b.retail_price_with_discount ?? b.retail_price) }
		else { av = a[sortField.value]; bv = b[sortField.value] }
		if (av < bv) return sortDir.value === 'asc' ? -1 : 1
		if (av > bv) return sortDir.value === 'asc' ? 1 : -1
		return 0
	})
	return data
})

const siteUrl = window.AppConfig?.siteUrl || ''

async function load() {
	try {
		loading.value = true
		error.value = ''
		const res = await fetch(`${siteUrl}/custom-categories/${categoryId}/products`)
		if (!res.ok) throw new Error()
		items.value = await res.json()
	} catch (e) {
		error.value = 'Ошибка загрузки товаров категории'
		items.value = []
	} finally {
		loading.value = false
	}
}

function getToken() {
	const m = document.cookie.match(/(?:^|; )Bearer=([^;]*)/)
	return m ? decodeURIComponent(m[1]) : ''
}

// Add products modal (modern table-based)
const showAdd = ref(false)
const productsSearch = ref('')
const modalProducts = ref([])
const modalLoading = ref(false)
const modalOffset = ref(0)
const modalLimit = ref(20)
const modalHasImage = ref('') // '', 'true', 'false'
const modalSortField = ref('id') // id | name | price
const modalSortDir = ref('desc')
const modalCanLoadMore = ref(true)

const categoryProductIds = computed(() => new Set(items.value.map(p => p.good_id)))

const filteredSortedModalProducts = computed(() => {
	let data = [...modalProducts.value]
	data.sort((a, b) => {
		let av, bv
		if (modalSortField.value === 'id') { av = a.good_id; bv = b.good_id }
		else if (modalSortField.value === 'name') { av = (a.good_name || a.fashion_name || '').toLowerCase(); bv = (b.good_name || b.fashion_name || '').toLowerCase() }
		else if (modalSortField.value === 'price') { av = Number(a.retail_price_with_discount ?? a.retail_price); bv = Number(b.retail_price_with_discount ?? b.retail_price) }
		else { av = a[modalSortField.value]; bv = b[modalSortField.value] }
		if (av < bv) return modalSortDir.value === 'asc' ? -1 : 1
		if (av > bv) return modalSortDir.value === 'asc' ? 1 : -1
		return 0
	})
	return data
})

function resetAndLoadModalProducts() {
	modalOffset.value = 0
	modalProducts.value = []
	modalCanLoadMore.value = true
	loadMoreModalProducts()
}

async function loadMoreModalProducts() {
	if (!modalCanLoadMore.value || modalLoading.value) return
	modalLoading.value = true
	try {
		const params = new URLSearchParams({ limit: String(modalLimit.value), offset: String(modalOffset.value) })
		if (productsSearch.value.trim()) params.set('search', productsSearch.value.trim())
		if (modalHasImage.value) params.set('has_image', modalHasImage.value)
		const data = await fetch(`${siteUrl}/products/${params.toString() ? `?${params.toString()}` : ''}`, { 
			headers: { accept: 'application/json' } 
		}).then(res => res.json())
		const batch = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
		if (batch.length < modalLimit.value) modalCanLoadMore.value = false
		modalProducts.value = modalProducts.value.concat(batch)
		modalOffset.value += modalLimit.value
	} catch (e) {
		modalCanLoadMore.value = false
	} finally {
		modalLoading.value = false
	}
}

function applyModalHasImageFilter(val) {
	modalHasImage.value = val === null ? '' : (val ? 'true' : 'false')
	resetAndLoadModalProducts()
}

async function openAdd() {
	showAdd.value = true
	resetAndLoadModalProducts()
}

async function addToCategory(productId) {
	if (categoryProductIds.value.has(productId)) {
		alert('Товар уже в этой категории')
		return
	}
	try {
		const res = await fetch(`${siteUrl}/custom-categories/${categoryId}/products/${productId}`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${getToken()}` }
		})
		if (!res.ok) throw new Error()
		await load()
		showAdd.value = false
	} catch (e) {
		alert('Ошибка при добавлении товара')
	}
}

onMounted(load)
</script>

<template>
	<div class="container mt-4">
		<div class="d-flex justify-content-between align-items-center mb-3">
			<h1>Товары категории</h1>
			<button class="btn btn-primary" @click="openAdd">Добавить еще товары</button>
		</div>
		<div class="row fw-bold text-secondary mb-2 px-3">
			<div class="col-12 col-md-2" style="cursor:pointer;" @click="sortField==='id' ? (sortDir = sortDir==='asc'?'desc':'asc') : (sortField='id', sortDir='desc')">Фото</div>
			<div class="col-12 col-md-4" style="cursor:pointer;" @click="sortField==='name' ? (sortDir = sortDir==='asc'?'desc':'asc') : (sortField='name', sortDir='asc')">Название</div>
			<div class="col-6 col-md-2">Размер</div>
			<div class="col-6 col-md-2">В наличии</div>
			<div class="col-12 col-md-2 text-end" style="cursor:pointer;" @click="sortField==='price' ? (sortDir = sortDir==='asc'?'desc':'asc') : (sortField='price', sortDir='desc')">Цена</div>
		</div>
		<div v-if="loading" class="text-muted">Загрузка…</div>
		<div v-else-if="error" class="alert alert-danger">{{ error }}</div>
		<div v-else id="products-list">
			<div v-if="sortedItems.length === 0" class="alert alert-info">Нет товаров в категории</div>
			<div v-else>
				<div v-for="product in sortedItems" :key="product.good_id" class="card mb-2 product-row px-3">
					<div class="card-body row align-items-start g-0 mb-0">
						<div class="col-12 col-md-2 d-flex align-items-center justify-content-center mb-2 mb-md-0">
							<div class="ratio ratio-1x1 w-100" style="max-width:90px;">
								<template v-if="mainImage(product)">
									<img :src="mainImage(product).image_url" class="object-fit-cover rounded" :alt="product.fashion_name || ''" />
								</template>
								<template v-else>
									<div class="d-flex align-items-center justify-content-center h-100 text-muted">Нет фото</div>
								</template>
							</div>
						</div>
						<div class="col-12 col-md-4 mb-2 mb-md-0">
							<div class="fw-bold">{{ product.fashion_name || '' }}</div>
							<div class="text-muted small">Артикул: <b>{{ product.articul || '' }}</b></div>
						</div>
						<div class="col-6 col-md-2 mb-2 mb-md-0">Размер: <b>{{ product.product_size || '' }}</b></div>
						<div class="col-6 col-md-2 mb-2 mb-md-0">В наличии: <b>{{ product.warehouse_quantity || 0 }}</b></div>
						<div class="col-12 col-md-2 text-end">
							<span class="fw-bold">
								<template v-if="product.retail_price_with_discount && product.retail_price_with_discount != product.retail_price">
									<span class="text-danger">{{ product.retail_price_with_discount }}</span>
									<span class="text-decoration-line-through text-muted small ms-1">{{ product.retail_price }}</span>
								</template>
								<template v-else>{{ product.retail_price }}</template>
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Add Products Modal -->
		<div v-if="showAdd" class="modal fade show d-block" tabindex="-1">
			<div class="modal-backdrop show"></div>
			<div class="modal-dialog modal-lg">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Добавить товары в категорию</h5>
						<button type="button" class="btn-close" @click="showAdd = false"></button>
					</div>
					<div class="modal-body">
						<div class="input-group mb-3">
							<span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
							<input v-model="productsSearch" @keydown.enter.prevent="resetAndLoadModalProducts" type="text" class="form-control" placeholder="Поиск (название, артикул)" />
							<button class="btn btn-outline-primary" @click="resetAndLoadModalProducts">Найти</button>
						</div>
						<div class="card">
							<div class="card-header d-flex flex-wrap gap-2 align-items-center justify-content-between">
								<div class="d-flex gap-2 align-items-center">
									<select class="form-select form-select-sm w-auto" v-model="modalLimit" @change="resetAndLoadModalProducts">
										<option :value="20">20</option>
										<option :value="50">50</option>
										<option :value="100">100</option>
									</select>
									<select class="form-select form-select-sm w-auto" v-model="modalHasImage" @change="resetAndLoadModalProducts">
										<option value="">Все</option>
										<option value="true">С фото</option>
										<option value="false">Без фото</option>
									</select>
								</div>
								<div class="d-flex gap-2 align-items-center">
									<label class="mb-0 small text-muted">Сортировать</label>
									<select class="form-select form-select-sm w-auto" v-model="modalSortField">
										<option value="id">ID</option>
										<option value="name">Название</option>
										<option value="price">Цена</option>
									</select>
									<div class="btn-group btn-group-sm" role="group">
										<button type="button" class="btn" :class="modalSortDir==='asc' ? 'btn-primary' : 'btn-outline-primary'" @click="modalSortDir='asc'">Возр.</button>
										<button type="button" class="btn" :class="modalSortDir==='desc' ? 'btn-primary' : 'btn-outline-primary'" @click="modalSortDir='desc'">Убыв.</button>
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
												<th>Добавить</th>
											</tr>
										</thead>
										<tbody>
											<tr v-if="modalProducts.length === 0 && modalLoading">
												<td colspan="6" class="text-center text-muted py-4">Загрузка...</td>
											</tr>
											<tr v-else-if="modalProducts.length === 0 && !modalLoading">
												<td colspan="6" class="text-center text-muted py-4">Нет товаров</td>
											</tr>
											<tr v-else v-for="p in filteredSortedModalProducts" :key="p.good_id">
												<td class="align-middle text-center" style="max-width:90px;">
													<div class="ratio ratio-1x1 w-100" style="max-width:90px;" @click.stop="applyModalHasImageFilter(!!mainImage(p))">
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
													<button class="btn btn-success btn-sm" :disabled="categoryProductIds.has(p.good_id)" :title="categoryProductIds.has(p.good_id) ? 'Товар уже в этой категории' : ''" @click="addToCategory(p.good_id)">+</button>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
						<div class="d-flex justify-content-center align-items-center mt-3" v-if="modalCanLoadMore">
							<button class="btn btn-outline-primary" @click="loadMoreModalProducts" :disabled="modalLoading">{{ modalLoading ? 'Загрузка…' : 'Загрузить еще' }}</button>
						</div>
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