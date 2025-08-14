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

// Add products modal
const showAdd = ref(false)
const allProducts = ref([])
const search = ref('')
const loadingAll = ref(false)

const filteredAllProducts = computed(() => {
	const s = search.value.trim().toLowerCase()
	const ids = new Set(items.value.map(p => p.good_id))
	return allProducts.value.filter(p => {
		const name = (p.fashion_name || p.good_name || '').toLowerCase()
		const articul = (p.articul || '').toLowerCase()
		return !ids.has(p.good_id) && (!s || name.includes(s) || articul.includes(s))
	})
})

async function openAdd() {
	showAdd.value = true
	await fetchAllProducts()
}

async function fetchAllProducts() {
	try {
		loadingAll.value = true
		const url = search.value.trim() ? `/products/?search=${encodeURIComponent(search.value.trim())}` : '/products/'
		const res = await fetch(`${siteUrl}${url}`, { headers: { accept: 'application/json' } })
		if (!res.ok) throw new Error()
		const data = await res.json()
		allProducts.value = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
	} catch (e) {
		allProducts.value = []
	} finally {
		loadingAll.value = false
	}
}

async function addToCategory(productId) {
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
							<input v-model="search" type="text" class="form-control" placeholder="Поиск по названию или артикулу..." @keydown.enter.prevent="fetchAllProducts" />
							<button class="btn btn-outline-primary" type="button" @click="fetchAllProducts">Поиск</button>
						</div>
						<div v-if="loadingAll" class="text-muted">Загрузка…</div>
						<div v-else id="all-products-list">
							<div v-if="filteredAllProducts.length === 0" class="alert alert-info">Нет товаров</div>
							<div v-else>
								<div v-for="p in filteredAllProducts" :key="p.good_id" class="card mb-2 product-row px-3">
									<div class="card-body row align-items-start g-0 mb-0">
										<div class="col-12 col-md-2 d-flex align-items-center justify-content-center mb-2 mb-md-0">
											<div class="ratio ratio-1x1 w-100" style="max-width:90px;">
												<template v-if="mainImage(p)">
													<img :src="mainImage(p).image_url" class="object-fit-cover rounded" style="max-width:80px;max-height:80px;" />
												</template>
												<template v-else>
													<div class="d-flex align-items-center justify-content-center h-100 text-muted">Нет фото</div>
												</template>
											</div>
										</div>
										<div class="col-12 col-md-4 mb-2 mb-md-0">
											<div class="fw-bold">{{ p.fashion_name || '' }}</div>
											<div class="text-muted small">Артикул: <b>{{ p.articul || '' }}</b></div>
										</div>
										<div class="col-12 col-md-2 text-end">
											<span class="fw-bold">
												<template v-if="p.retail_price_with_discount && p.retail_price_with_discount != p.retail_price">
													<span class="text-danger">{{ p.retail_price_with_discount }}</span>
													<span class="text-decoration-line-through text-muted small ms-1">{{ p.retail_price }}</span>
												</template>
												<template v-else>{{ p.retail_price }}</template>
											</span>
											<button class="btn btn-success btn-sm ms-2" @click="addToCategory(p.good_id)">+</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.modal.show { display: block !important; position: fixed; inset: 0; z-index: 1050; }
.modal-backdrop.show { position: fixed; inset: 0; background: rgba(0,0,0,0.5); opacity: 1; z-index: 1040; }
.modal-dialog { position: relative; z-index: 1055; }
.modal-content { position: relative; z-index: 1056; }
</style>