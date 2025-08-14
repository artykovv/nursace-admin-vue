<script setup>
import { ref, computed, onMounted } from 'vue'

const discounts = ref([])
const loading = ref(false)
const error = ref('')

const siteUrl = window.AppConfig?.siteUrl || ''

function getToken() {
	const m = document.cookie.match(/(?:^|; )Bearer=([^;]*)/)
	return m ? decodeURIComponent(m[1]) : ''
}

async function apiGet(path) {
	const res = await fetch(`${siteUrl}${path}`, { headers: { accept: 'application/json' } })
	if (!res.ok) throw new Error(await res.text())
	return res.json()
}

async function apiJson(path, method, body) {
	const res = await fetch(`${siteUrl}${path}`, {
		method,
		headers: { 'Content-Type': 'application/json', accept: 'application/json', Authorization: `Bearer ${getToken()}` },
		body: JSON.stringify(body)
	})
	if (!res.ok) throw new Error(await res.text())
	return res.json().catch(() => ({}))
}

function formatDateForAPI(local) {
	if (!local) return ''
	// from YYYY-MM-DDTHH:mm to YYYY-MM-DD HH:mm:00
	return local.replace('T', ' ') + ':00'
}

function toLocalDatetime(value) {
	if (!value) return ''
	// value might be 'YYYY-MM-DD HH:mm:ss' → convert to 'YYYY-MM-DDTHH:mm'
	const v = value.replace(' ', 'T')
	return v.slice(0, 16)
}

async function loadDiscounts() {
	loading.value = true
	error.value = ''
	try {
		discounts.value = await apiGet('/discounts/')
	} catch (e) {
		error.value = 'Ошибка загрузки скидок'
		discounts.value = []
	} finally {
		loading.value = false
	}
}

// Create modal
const showCreate = ref(false)
const createForm = ref({ name: '', description: '', discount_percent: 0, start_date: '', end_date: '', is_active: true })
async function onCreate() {
	try {
		await apiJson('/discounts/', 'POST', {
			name: createForm.value.name,
			description: createForm.value.description,
			discount_percent: Number(createForm.value.discount_percent),
			start_date: formatDateForAPI(createForm.value.start_date),
			end_date: formatDateForAPI(createForm.value.end_date),
			is_active: !!createForm.value.is_active,
		})
		showCreate.value = false
		createForm.value = { name: '', description: '', discount_percent: 0, start_date: '', end_date: '', is_active: true }
		await loadDiscounts()
	} catch (e) {
		alert('Ошибка при создании скидки')
	}
}

// Edit modal
const showEdit = ref(false)
const editForm = ref({ id: null, name: '', description: '', discount_percent: 0, start_date: '', end_date: '', is_active: false })
function openEdit(d) {
	editForm.value = {
		id: d.id,
		name: d.name || '',
		description: d.description || '',
		discount_percent: d.discount_percent ?? 0,
		start_date: toLocalDatetime(d.start_date),
		end_date: toLocalDatetime(d.end_date),
		is_active: !!d.is_active,
	}
	showEdit.value = true
}
async function onUpdate() {
	try {
		await apiJson(`/discounts/${editForm.value.id}`, 'PUT', {
			id: editForm.value.id,
			name: editForm.value.name,
			description: editForm.value.description,
			discount_percent: Number(editForm.value.discount_percent),
			start_date: formatDateForAPI(editForm.value.start_date),
			end_date: formatDateForAPI(editForm.value.end_date),
			is_active: !!editForm.value.is_active,
		})
		showEdit.value = false
		await loadDiscounts()
	} catch (e) {
		alert('Ошибка при сохранении скидки')
	}
}

// Delete modal
const showDelete = ref(false)
const deleteId = ref(null)
function openDelete(id) {
	deleteId.value = id
	showDelete.value = true
}
async function onDelete() {
	try {
		await apiJson(`/discounts/${deleteId.value}`, 'DELETE', null)
		showDelete.value = false
		await loadDiscounts()
	} catch (e) {
		alert('Ошибка при удалении скидки')
	}
}

// Products modal
const showProducts = ref(false)
const currentDiscountId = ref(null)
const discountProducts = ref([])

function mainImage(product) {
	const imgs = product?.images || []
	return imgs.find(i => i.is_main) || imgs[0] || null
}

async function openProducts(discountId) {
	currentDiscountId.value = discountId
	showProducts.value = true
	await fetchDiscountProducts(discountId)
}

async function fetchDiscountProducts(discountId) {
	try {
		discountProducts.value = await apiGet(`/discounts/${discountId}/products`)
	} catch (e) {
		discountProducts.value = []
		alert('Ошибка загрузки товаров скидки')
	}
}

async function removeProductFromDiscount(productId) {
	try {
		await apiJson(`/discounts/${currentDiscountId.value}/products`, 'DELETE', { product_ids: [productId] })
		await fetchDiscountProducts(currentDiscountId.value)
	} catch (e) {
		alert('Ошибка при удалении товара')
	}
}

// Add Products modal (banner-like)
const showAddProducts = ref(false)
const productsSearch = ref('')
const modalProducts = ref([])
const modalLoading = ref(false)
const modalOffset = ref(0)
const modalLimit = ref(20)
const modalHasImage = ref('') // '', 'true', 'false'
const modalSortField = ref('id') // id | name | price
const modalSortDir = ref('desc')
const modalCanLoadMore = ref(true)
let otherDiscountProductIds = new Set()

const discountProductIds = computed(() => new Set(discountProducts.value.map(p => p.good_id)))

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

async function buildOtherDiscountsIndex() {
	otherDiscountProductIds = new Set()
	try {
		const all = await apiGet('/discounts/')
		const others = Array.isArray(all) ? all.filter(d => d.id !== currentDiscountId.value) : []
		for (const d of others) {
			try {
				const prods = await apiGet(`/discounts/${d.id}/products`)
				(prods || []).forEach(p => { if (p && typeof p.good_id !== 'undefined') otherDiscountProductIds.add(p.good_id) })
			} catch {}
		}
	} catch {}
}

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
		const data = await apiGet(`/products/${params.toString() ? `?${params.toString()}` : ''}`)
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

async function openAddProductsModal() {
	showAddProducts.value = true
	await buildOtherDiscountsIndex()
	resetAndLoadModalProducts()
}

async function addProductToDiscount(productId) {
	if (otherDiscountProductIds.has(productId)) {
		alert('Этот товар уже участвует в другой скидке')
		return
	}
	if (discountProductIds.value.has(productId)) {
		alert('Товар уже в этой скидке')
		return
	}
	try {
		await apiJson(`/discounts/${currentDiscountId.value}/products`, 'POST', { product_ids: [productId] })
		await fetchDiscountProducts(currentDiscountId.value)
		showAddProducts.value = false
	} catch (e) {
		alert('Ошибка при добавлении товара')
	}
}

onMounted(loadDiscounts)
</script>

<template>
	<div class="container mt-4">
		<h1>Скидки</h1>
		<button class="btn btn-success mb-3" @click="showCreate = true">Добавить скидку</button>
		<div v-if="loading" class="text-muted">Загрузка…</div>
		<div v-else-if="error" class="alert alert-danger">{{ error }}</div>
		<table v-else class="table">
			<thead>
				<tr>
					<th>Название</th>
					<th>Описание</th>
					<th>Скидка (%)</th>
					<th>Дата начала</th>
					<th>Дата окончания</th>
					<th>Статус</th>
					<th>Действия</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="d in discounts" :key="d.id">
					<td>{{ d.name }}</td>
					<td>{{ d.description }}</td>
					<td>{{ d.discount_percent }}</td>
					<td>{{ new Date(d.start_date).toLocaleString('ru-RU') }}</td>
					<td>{{ new Date(d.end_date).toLocaleString('ru-RU') }}</td>
					<td>{{ d.is_active ? 'Активна' : 'Неактивна' }}</td>
					<td>
						<button class="btn btn-primary btn-sm me-2" @click="openEdit(d)">Редактировать</button>
						<button class="btn btn-danger btn-sm me-2" @click="openDelete(d.id)">Удалить</button>
						<button class="btn btn-info btn-sm" @click="openProducts(d.id)">Товары</button>
					</td>
				</tr>
			</tbody>
		</table>

		<!-- Create Modal -->
		<div v-if="showCreate" class="modal fade show d-block" tabindex="-1">
			<div class="modal-backdrop show"></div>
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Новая скидка</h5>
						<button type="button" class="btn-close" @click="showCreate = false"></button>
					</div>
					<div class="modal-body">
						<form @submit.prevent="onCreate">
							<div class="mb-3">
								<label class="form-label">Название</label>
								<input v-model="createForm.name" type="text" class="form-control" required />
							</div>
							<div class="mb-3">
								<label class="form-label">Описание</label>
								<textarea v-model="createForm.description" class="form-control" required></textarea>
							</div>
							<div class="mb-3">
								<label class="form-label">Скидка (%)</label>
								<input v-model.number="createForm.discount_percent" type="number" min="0" max="100" class="form-control" required />
							</div>
							<div class="mb-3">
								<label class="form-label">Дата начала</label>
								<input v-model="createForm.start_date" type="datetime-local" class="form-control" required />
							</div>
							<div class="mb-3">
								<label class="form-label">Дата окончания</label>
								<input v-model="createForm.end_date" type="datetime-local" class="form-control" required />
							</div>
							<div class="form-check mb-3">
								<input v-model="createForm.is_active" class="form-check-input" type="checkbox" id="createIsActive">
								<label class="form-check-label" for="createIsActive">Активна</label>
							</div>
						</form>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" @click="showCreate = false">Закрыть</button>
						<button type="button" class="btn btn-primary" @click="onCreate">Сохранить</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Edit Modal -->
		<div v-if="showEdit" class="modal fade show d-block" tabindex="-1">
			<div class="modal-backdrop show"></div>
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Редактировать скидку</h5>
						<button type="button" class="btn-close" @click="showEdit = false"></button>
					</div>
					<div class="modal-body">
						<form @submit.prevent="onUpdate">
							<div class="mb-3">
								<label class="form-label">Название</label>
								<input v-model="editForm.name" type="text" class="form-control" required />
							</div>
							<div class="mb-3">
								<label class="form-label">Описание</label>
								<textarea v-model="editForm.description" class="form-control" required></textarea>
							</div>
							<div class="mb-3">
								<label class="form-label">Скидка (%)</label>
								<input v-model.number="editForm.discount_percent" type="number" min="0" max="100" class="form-control" required />
							</div>
							<div class="mb-3">
								<label class="form-label">Дата начала</label>
								<input v-model="editForm.start_date" type="datetime-local" class="form-control" required />
							</div>
							<div class="mb-3">
								<label class="form-label">Дата окончания</label>
								<input v-model="editForm.end_date" type="datetime-local" class="form-control" required />
							</div>
							<div class="form-check mb-3">
								<input v-model="editForm.is_active" class="form-check-input" type="checkbox" id="editIsActive">
								<label class="form-check-label" for="editIsActive">Активна</label>
							</div>
						</form>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" @click="showEdit = false">Закрыть</button>
						<button type="button" class="btn btn-primary" @click="onUpdate">Сохранить</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Delete Modal -->
		<div v-if="showDelete" class="modal fade show d-block" tabindex="-1">
			<div class="modal-backdrop show"></div>
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Подтверждение удаления</h5>
						<button type="button" class="btn-close" @click="showDelete = false"></button>
					</div>
					<div class="modal-body">Вы уверены, что хотите удалить эту скидку?</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" @click="showDelete = false">Отмена</button>
						<button type="button" class="btn btn-danger" @click="onDelete">Удалить</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Products Modal -->
		<div v-if="showProducts" class="modal fade show d-block" tabindex="-1">
			<div class="modal-backdrop show"></div>
			<div class="modal-dialog modal-lg">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Товары скидки</h5>
						<button type="button" class="btn-close" @click="showProducts = false"></button>
					</div>
					<div class="modal-body">
						<div class="d-flex justify-content-between align-items-center mb-3">
							<h5>Товары в скидке</h5>
							<button class="btn btn-primary" @click="openAddProductsModal">Добавить товары</button>
						</div>
						<div class="row fw-bold text-secondary mb-2 px-3">
							<div class="col-12 col-md-2">Фото</div>
							<div class="col-12 col-md-4">Название</div>
							<div class="col-6 col-md-2">Размер</div>
							<div class="col-6 col-md-2">В наличии</div>
							<div class="col-12 col-md-2 text-end">Цена</div>
						</div>
						<div v-if="discountProducts.length === 0" class="alert alert-info">Нет товаров в скидке</div>
						<div v-else>
							<div v-for="p in discountProducts" :key="p.good_id" class="card mb-2 product-row px-3">
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
										<div class="fw-bold">{{ p.good_name || '' }}</div>
										<div class="text-muted small">Артикул: <b>{{ p.articul || '' }}</b></div>
									</div>
									<div class="col-6 col-md-2 mb-2 mb-md-0">Размер: <b>{{ p.product_size || 'Не указан' }}</b></div>
									<div class="col-6 col-md-2 mb-2 mb-md-0">В наличии: <b>{{ p.warehouse_quantity || 0 }}</b></div>
									<div class="col-12 col-md-2 text-end">
										<span class="fw-bold">
											<template v-if="p.retail_price_with_discount && p.retail_price_with_discount != p.retail_price">
												<span class="text-danger">{{ p.retail_price_with_discount }}</span>
												<span class="text-decoration-line-through text-muted small ms-1">{{ p.retail_price }}</span>
											</template>
											<template v-else>{{ p.retail_price }}</template>
										</span>
										<button class="btn btn-danger btn-sm ms-2" @click="removeProductFromDiscount(p.good_id)">-</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Add Products Modal (banner-like) -->
		<div v-if="showAddProducts" class="modal fade show d-block" tabindex="-1">
			<div class="modal-backdrop show"></div>
			<div class="modal-dialog modal-lg">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Добавить товары в скидку</h5>
						<button type="button" class="btn-close" @click="showAddProducts = false"></button>
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
													<button class="btn btn-success btn-sm" :disabled="otherDiscountProductIds.has(p.good_id) || discountProductIds.has(p.good_id)" :title="otherDiscountProductIds.has(p.good_id) ? 'Товар уже участвует в другой скидке' : (discountProductIds.has(p.good_id) ? 'Товар уже в этой скидке' : '')" @click="addProductToDiscount(p.good_id)">+</button>
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