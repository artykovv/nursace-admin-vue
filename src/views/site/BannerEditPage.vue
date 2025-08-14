<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import SiteMiniHeader from './components/SiteMiniHeader.vue'

const router = useRouter()

// State
const carouselImages = ref([])
const newCarouselImages = ref([])
const loading = ref(false)
const error = ref(null)
const uploadBusy = ref(false)
const dragIdx = ref(null)

// Constants
const PLACEHOLDER_IMAGE = 'https://placehold.co/160x120'

// Modal state
const showHrefModal = ref(false)
const currentHrefEditIdx = ref(null)
const selectedHrefType = ref(null)
const selectedHrefId = ref(null)
const selectedHrefObj = ref(null)
const activeTab = ref('product')

// Search state
const productSearch = ref('')
const discountsSearch = ref('')

// Product management state
const productItems = ref([])
const productOffset = ref(0)
const productLimit = ref(5)
const productHasImage = ref('')
const productSortField = ref('id')
const productSortDir = ref('desc')
const productCanLoadMore = ref(true)
const loadingProducts = ref(false)

// Discounts management state
const discountsItems = ref([])
const loadingDiscounts = ref(false)

// Computed
const allImages = computed(() => [...carouselImages.value, ...newCarouselImages.value])

const filteredSortedProducts = computed(() => {
	let data = [...productItems.value]
	// client side sort
	data.sort((a, b) => {
		let av, bv
		if (productSortField.value === 'id') { av = a.good_id; bv = b.good_id }
		else if (productSortField.value === 'name') { av = (a.good_name || a.fashion_name || '').toLowerCase(); bv = (b.good_name || b.fashion_name || '').toLowerCase() }
		else if (productSortField.value === 'price') { av = Number(a.retail_price_with_discount ?? a.retail_price); bv = Number(b.retail_price_with_discount ?? b.retail_price) }
		else { av = a[productSortField.value]; bv = b[productSortField.value] }
		if (av < bv) return productSortDir.value === 'asc' ? -1 : 1
		if (av > bv) return productSortDir.value === 'asc' ? 1 : -1
		return 0
	})
	return data
})

const filteredDiscounts = computed(() => {
	if (!discountsSearch.value.trim()) return discountsItems.value
	return discountsItems.value.filter(d => (d.name || '').toLowerCase().includes(discountsSearch.value.toLowerCase()))
})

// Functions
function getToken() {
	const match = document.cookie.match(/(?:^|; )Bearer=([^;]*)/)
	return match ? decodeURIComponent(match[1]) : ''
}

function fetchWithAuth(url, options = {}) {
	const token = getToken()
	options.headers = {
		...options.headers,
		"Authorization": `Bearer ${token}`,
		...((options.body instanceof FormData) ? {} : {"Content-Type": "application/json"}),
		"Accept": "application/json"
	}
	return fetch(url, options)
}

async function fetchCarouselImages() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || 'https://api.style-shoes.shop'
		const res = await fetchWithAuth(`${siteUrl}/carousel/`)
		if (!res.ok) throw new Error('Ошибка загрузки карусели')
		return await res.json()
	} catch (e) {
		throw e
	}
}

async function loadData() {
	loading.value = true
	error.value = null
	try {
		const images = await fetchCarouselImages()
		carouselImages.value = images
		await fillHrefObjForAll()
	} catch (e) {
		error.value = e.message
	} finally {
		loading.value = false
	}
}

// Drag & Drop functions
function onDragStart(idx, e) {
	dragIdx.value = idx
	e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(e) {
	e.preventDefault()
	e.currentTarget.style.borderColor = '#007bff'
}

function onDragLeave(e) {
	e.preventDefault()
	e.currentTarget.style.borderColor = ''
}

function onDrop(e, idx) {
	e.preventDefault()
	e.currentTarget.style.borderColor = ''
	if (dragIdx.value === null || dragIdx.value === idx) return
	
	const all = [...carouselImages.value, ...newCarouselImages.value]
	const [moved] = all.splice(dragIdx.value, 1)
	all.splice(idx, 0, moved)
	
	carouselImages.value = all.filter(i => !i.is_new)
	newCarouselImages.value = all.filter(i => i.is_new)
	
	dragIdx.value = null
}

function onDragEnd() {
	dragIdx.value = null
}

// Image management functions
function removeImage(idx) {
	const all = [...carouselImages.value, ...newCarouselImages.value]
	const img = all[idx]
	if (!img) return
	
	if (img.is_new) {
		newCarouselImages.value = newCarouselImages.value.filter(i => i !== img)
	} else {
		if (!confirm('Удалить изображение?')) return
		deleteImage(img.id)
	}
}

async function deleteImage(imageId) {
	try {
		const siteUrl = window.AppConfig?.siteUrl || 'https://api.style-shoes.shop'
		const res = await fetchWithAuth(`${siteUrl}/carousel/${imageId}`, {
			method: 'DELETE'
		})
		if (res.ok) {
			carouselImages.value = carouselImages.value.filter(i => i.id !== imageId)
		} else {
			alert('Ошибка при удалении')
		}
	} catch (e) {
		alert('Ошибка при удалении')
	}
}

// Href management functions
function openHrefModal(idx) {
	currentHrefEditIdx.value = idx
	selectedHrefType.value = null
	selectedHrefId.value = null
	selectedHrefObj.value = null
	activeTab.value = 'product'
	
	// Clear search fields
	productSearch.value = ''
	discountsSearch.value = ''
	
	showHrefModal.value = true
	
	// Initialize lists with data
	initializeModalData()
}

// Tab button handlers to force load on first click
function setTab(tab) {
	if (activeTab.value !== tab) {
		activeTab.value = tab
		initializeModalData()
	}
}

function removeHref(idx) {
	const all = [...carouselImages.value, ...newCarouselImages.value]
	all[idx].href = ''
	all[idx]._hrefObj = undefined
}

function getHrefLabel(img) {
	if (!img.href || !img._hrefObj) return ''
	
	if (img.href.startsWith('/product?good_id=')) {
		return 'Товар'
	} else if (img.href.includes('discounts=true') && img.href.includes('discount_id=')) {
		return 'Скидка'
	}
	return ''
}

function getHrefName(img) {
	if (!img.href || !img._hrefObj) return ''
	
	if (img.href.startsWith('/product?good_id=')) {
		return img._hrefObj.fashion_name || ''
	} else if (img.href.includes('discounts=true') && img.href.includes('discount_id=')) {
		return img._hrefObj.name || ''
	}
	return ''
}

function getHrefTooltip(img) {
	if (!img.href || !img._hrefObj) return ''
	
	if (img.href.startsWith('/product?good_id=')) {
		const name = img._hrefObj.fashion_name || ''
		const articul = img._hrefObj.articul || ''
		return name + (articul ? ' / ' + articul : '')
	} else if (img.href.includes('discounts=true') && img.href.includes('discount_id=')) {
		return `${img._hrefObj.name || ''} (${img._hrefObj.discount_percent ?? 0}%)`
	}
	return ''
}

// Modal data management
async function initializeModalData() {
	try {
		if (activeTab.value === 'product') {
			// Reset product state
			productOffset.value = 0
			productItems.value = []
			productCanLoadMore.value = true
			await loadMoreProducts()
		} else if (activeTab.value === 'discount') {
			loadingDiscounts.value = true
			discountsItems.value = []
			discountsItems.value = await fetchDiscounts()
			loadingDiscounts.value = false
		}
	} catch (e) {
		console.error('Error initializing modal data:', e)
		if (activeTab.value === 'discount') loadingDiscounts.value = false
	}
}

// Product-specific functions
function mainProductImage(product) {
	const imgs = product?.images || []
	return imgs.find(i => i.is_main) || imgs[0] || null
}

function applyProductHasImageFilter(val) {
	productHasImage.value = val === null ? '' : (val ? 'true' : 'false')
	resetProductSearch()
}

function resetProductSearch() {
	productOffset.value = 0
	productItems.value = []
	productCanLoadMore.value = true
	loadMoreProducts()
}

async function loadMoreProducts() {
	if (!productCanLoadMore.value || loadingProducts.value) return
	loadingProducts.value = true
	
	try {
		const siteUrl = window.AppConfig?.siteUrl || 'https://api.style-shoes.shop'
		const params = new URLSearchParams({ 
			limit: String(productLimit.value), 
			offset: String(productOffset.value) 
		})
		if (productSearch.value.trim()) params.set('search', productSearch.value.trim())
		if (productHasImage.value) params.set('has_image', productHasImage.value)
		
		const res = await fetchWithAuth(`${siteUrl}/products/?${params.toString()}`)
		if (!res.ok) throw new Error('Failed')
		
		const data = await res.json()
		const batch = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
		
		if (batch.length < productLimit.value) productCanLoadMore.value = false
		productItems.value = productItems.value.concat(batch)
		productOffset.value += productLimit.value
	} catch (e) {
		console.error('Error loading products:', e)
		productCanLoadMore.value = false
	} finally {
		loadingProducts.value = false
	}
}

async function searchProducts() {
	const search = productSearch.value.trim()
	
	// Reset product state for new search
	productOffset.value = 0
	productItems.value = []
	productCanLoadMore.value = true
	
	await loadMoreProducts()
}

function selectProduct(product) {
	selectedHrefType.value = 'product'
	selectedHrefId.value = product.good_id
	selectedHrefObj.value = product
}

// Discount-specific functions
async function searchDiscounts() {
	const search = discountsSearch.value.trim()
	loadingDiscounts.value = true
	const all = await fetchDiscounts()
	discountsItems.value = search ? all.filter(d => (d.name || '').toLowerCase().includes(search.toLowerCase())) : all
	loadingDiscounts.value = false
}

function selectDiscount(discount) {
	selectedHrefType.value = 'discount'
	selectedHrefId.value = discount.id
	selectedHrefObj.value = discount
}

// Selection functions
function selectHref() {
	if (!selectedHrefType.value || !selectedHrefId.value) return
	
	const all = [...carouselImages.value, ...newCarouselImages.value]
	let href = ''
	
	if (selectedHrefType.value === 'product') {
		href = `/product?good_id=${selectedHrefId.value}`
	} else if (selectedHrefType.value === 'discount') {
		href = `/category?discounts=true&discount_id=${selectedHrefId.value}`
	}
	
	all[currentHrefEditIdx.value].href = href
	all[currentHrefEditIdx.value]._hrefObj = selectedHrefObj.value
	
	showHrefModal.value = false
}

// File upload functions
function onFileSelect(e) {
	const files = Array.from(e.target.files)
	if (files.length === 0) return
	
	handleFiles(files)
	e.target.value = ''
}

function onFileDrop(e) {
	e.preventDefault()
	const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
	if (files.length === 0) return
	
	handleFiles(files)
}

async function handleFiles(files) {
	if (uploadBusy.value) return
	uploadBusy.value = true
	
	try {
		const siteUrl = window.AppConfig?.siteUrl || 'https://api.style-shoes.shop'
		
		// Create single FormData with all files
		const formData = new FormData()
		files.forEach(file => {
			formData.append('files', file)
		})
		
		// Upload all files in one request
		const res = await fetchWithAuth(`${siteUrl}/storage/upload`, {
			method: 'POST',
			body: formData
		})
		
		if (res.ok) {
			const result = await res.json()
			
			if (result.uploaded_urls && result.uploaded_urls.length > 0) {
				// Add all uploaded images
				result.uploaded_urls.forEach((imageUrl, index) => {
					const newImage = {
						src: imageUrl,
						href: '',
						is_new: true
					}
					
					newCarouselImages.value.push(newImage)
				})
			}
		} else {
			alert('Ошибка при загрузке файлов')
		}
	} catch (e) {
		alert('Ошибка при загрузке файлов')
	} finally {
		uploadBusy.value = false
	}
}

// Href object filling functions
async function fillHrefObjForAll() {
	if (!carouselImages.value.length) return
	
	try {
		const [products, discounts] = await Promise.all([
			fetchProducts(), fetchDiscounts()
		])
		
		for (const img of carouselImages.value) {
			if (!img.href) continue
			if (img.href.startsWith('/product?good_id=')) {
				const id = Number(img.href.split('=')[1])
				img._hrefObj = products.find(p => p.good_id === id)
			} else if (img.href.includes('discounts=true') && img.href.includes('discount_id=')) {
				const id = Number(new URLSearchParams(img.href.split('?')[1]).get('discount_id'))
				img._hrefObj = discounts.find(d => d.id === id)
			}
		}
	} catch (e) {
		console.error('Error filling href objects:', e)
	}
}

async function fetchProducts() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || 'https://api.style-shoes.shop'
		const res = await fetchWithAuth(`${siteUrl}/products/`)
		if (!res.ok) return []
		const data = await res.json()
		return data
	} catch (e) {
		console.error('Error fetching products:', e)
		return []
	}
}

async function fetchDiscounts() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || 'https://api.style-shoes.shop'
		const res = await fetchWithAuth(`${siteUrl}/discounts/`)
		if (!res.ok) return []
		const data = await res.json()
		const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : [])
		return items
	} catch (e) {
		console.error('Error fetching discounts:', e)
		return []
	}
}
 
 // Save function
async function saveCarouselImages() {
	const all = [...carouselImages.value, ...newCarouselImages.value]
	if (all.length === 0) {
		alert('Добавьте хотя бы одно изображение')
		return
	}
	
	// Сохраняем новые изображения
	for (const img of newCarouselImages.value) {
		try {
			const siteUrl = window.AppConfig?.siteUrl || 'https://api.style-shoes.shop'
			const res = await fetchWithAuth(`${siteUrl}/carousel/`, {
				method: 'POST',
				body: JSON.stringify({ src: img.src, href: img.href })
			})
			if (!res.ok) throw new Error()
		} catch (e) {
			alert('Ошибка при добавлении изображения')
			return
		}
	}
	
	// Обновляем href для существующих изображений
	for (const img of carouselImages.value) {
		try {
			const siteUrl = window.AppConfig?.siteUrl || 'https://api.style-shoes.shop'
			const res = await fetchWithAuth(`${siteUrl}/carousel/${img.id}`, {
				method: 'PUT',
				body: JSON.stringify({ href: img.href || '' })
			})
			if (!res.ok) throw new Error()
		} catch (e) {
			alert('Ошибка при обновлении ссылки баннера')
			return
		}
	}
	
	router.push('/site/banner')
}

// Lifecycle
onMounted(() => {
	loadData()
})

// Watch for activeTab changes to initialize lists
watch(activeTab, (newTab) => {
	if (showHrefModal.value) {
		// Clear previous selection when switching tabs
		selectedHrefType.value = null
		selectedHrefId.value = null
		selectedHrefObj.value = null
		
		// Load data for the new tab
		initializeModalData()
	}
})
</script>

<template>
	<div class="container mt-4">

		
		<h1>Изменить баннер (карусель)</h1>
		
		<div id="carousel-image-section">
			<div v-if="loading" class="text-center text-muted py-4">
				Загрузка...
			</div>
			
			<div v-else-if="error" class="alert alert-danger">
				{{ error }}
			</div>
			
			<div v-else>
				<div class="carousel-image-list" id="carousel-image-list">
					<div 
						v-for="(img, idx) in allImages" 
						:key="img.id || `new_${idx}`"
						class="carousel-image-card"
						draggable="true"
						@dragstart="onDragStart(idx, $event)"
						@dragover="onDragOver($event)"
						@dragleave="onDragLeave($event)"
						@drop="onDrop($event, idx)"
						@dragend="onDragEnd"
					>
						<img :src="img.src || PLACEHOLDER_IMAGE" alt="image">
						
						<button 
							class="remove-btn" 
							title="Удалить" 
							type="button" 
							@click="removeImage(idx)"
						>
							&times;
						</button>
						
						<div class="carousel-content">
							<span v-if="img.href && img._hrefObj" 
								  class="href-label" 
								  :title="getHrefTooltip(img)"
							>
								{{ getHrefLabel(img) }}: {{ getHrefName(img) }}
							</span>
							
							<div class="carousel-actions">
								<button v-if="img.href" 
										class="carousel-action-btn" 
										type="button" 
										title="Изменить ссылку" 
										@click="openHrefModal(idx)"
								>
									<i class='bi bi-pencil'></i>Изменить
								</button>
								<button v-if="img.href" 
										class="carousel-action-btn danger" 
										type="button" 
										title="Удалить ссылку" 
										@click="removeHref(idx)"
								>
									<i class='bi bi-x-lg'></i>Удалить ссылку
								</button>
								<button v-else 
										class="carousel-action-btn" 
										type="button" 
										@click="openHrefModal(idx)"
								>
									<i class='bi bi-link-45deg'></i>Добавить ссылку
								</button>
							</div>
						</div>
					</div>
					
					<div 
						class="carousel-image-card add-carousel-image-btn" 
						@click="$refs.fileInput.click()"
						@dragover.prevent
						@drop="onFileDrop"
					>
						<div style="font-size:32px;">+</div>
						<div style="font-size:14px;">Добавить</div>
						<input 
							ref="fileInput" 
							type="file" 
							accept="image/*" 
							style="display:none;" 
							@change="onFileSelect" 
							:disabled="uploadBusy"
						>
					</div>
				</div>
			</div>
		</div>
		
		<div class="mt-4 text-end">
			<button @click="saveCarouselImages" class="btn btn-success">
				Сохранить
			</button>
		</div>
		
		<!-- Модальное окно выбора ссылки -->
		<div v-if="showHrefModal" class="modal fade show d-block" tabindex="-1">
			<div class="modal-backdrop show"></div>
			<div class="modal-dialog modal-lg">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Выберите, куда ведёт баннер</h5>
						<button type="button" class="btn-close" @click="showHrefModal = false"></button>
					</div>
					<div class="modal-body">
						<ul class="nav nav-tabs mb-3" role="tablist">
							<li class="nav-item" role="presentation">
								<button class="nav-link" 
										:class="{ active: activeTab === 'product' }"
										@click="setTab('product')">
									Товар
								</button>
							</li>
							<li class="nav-item" role="presentation">
								<button class="nav-link" 
										:class="{ active: activeTab === 'discount' }"
										@click="setTab('discount')">
									Скидка
								</button>
							</li>
						</ul>
						
						<div class="tab-content">
							<div v-show="activeTab === 'product'" class="tab-pane fade" :class="{ show: activeTab === 'product', active: activeTab === 'product' }">
								<div class="input-group mb-3">
									<span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
									<input type="text" 
										   class="form-control" 
										   v-model="productSearch" 
										   placeholder="Поиск (название, артикул)"
										   @keydown.enter.prevent="searchProducts">
									<button class="btn btn-outline-primary" 
											type="button"
											@click="searchProducts">
										Найти
									</button>
								</div>
								
								<div class="card">
									<div class="card-header d-flex flex-wrap gap-2 align-items-center justify-content-between">
										<div class="d-flex gap-2 align-items-center">
											<select class="form-select form-select-sm ps-3 pe-4" v-model="productLimit" @change="resetProductSearch">
												<option :value="20">20</option>
												<option :value="50">50</option>
												<option :value="100">100</option>
											</select>
											<select class="form-select form-select-sm pe-5" v-model="productHasImage" @change="resetProductSearch">
												<option value="">Все</option>
												<option value="true">С фото</option>
												<option value="false">Без фото</option>
											</select>
										</div>
										<div class="d-flex gap-2 align-items-center">
											<label class="mb-0 small text-muted">Сортировать</label>
											<select class="form-select form-select-sm w-auto" v-model="productSortField">
												<option value="id">ID</option>
												<option value="name">Название</option>
												<option value="price">Цена</option>
											</select>
											<div class="btn-group btn-group-sm" role="group">
												<button type="button" class="btn" :class="productSortDir==='asc' ? 'btn-primary' : 'btn-outline-primary'" @click="productSortDir='asc'">Возр.</button>
												<button type="button" class="btn" :class="productSortDir==='desc' ? 'btn-primary' : 'btn-outline-primary'" @click="productSortDir='desc'">Убыв.</button>
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
														<th>Выбрать</th>
													</tr>
												</thead>
												<tbody>
													<tr v-if="productItems.length === 0 && loadingProducts">
														<td colspan="6" class="text-center text-muted py-4">Загрузка...</td>
													</tr>
													<tr v-else-if="productItems.length === 0 && !loadingProducts">
														<td colspan="6" class="text-center text-muted py-4">Нет товаров</td>
													</tr>
													<tr v-else v-for="p in filteredSortedProducts" :key="p.good_id">
														<td class="align-middle text-center" style="max-width:90px;">
															<div class="ratio ratio-1x1 w-100" style="max-width:90px;" @click.stop="applyProductHasImageFilter(!!mainProductImage(p))">
																<template v-if="mainProductImage(p)">
																	<img :src="mainProductImage(p).image_url" class="object-fit-cover rounded" :alt="p.good_name || p.fashion_name || ''" style="max-width:80px;max-height:80px;" />
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
															<div class="form-check m-0">
																<input class="form-check-input" type="radio" name="href-radio" :checked="selectedHrefType==='product' && selectedHrefId===p.good_id" @change="selectProduct(p)">
															</div>
														</td>
													</tr>
												</tbody>
											</table>
										</div>
									</div>
								</div>
								
								<div class="d-flex justify-content-center align-items-center mt-3" v-if="productCanLoadMore">
									<button class="btn btn-outline-primary" @click="loadMoreProducts" :disabled="loadingProducts">
										{{ loadingProducts ? 'Загрузка…' : 'Загрузить еще' }}
									</button>
								</div>
							</div>
							
							<div v-show="activeTab === 'discount'" class="tab-pane fade" :class="{ show: activeTab === 'discount', active: activeTab === 'discount' }">
								<div class="input-group mb-3">
									<span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
									<input type="text" 
										   class="form-control" 
										   v-model="discountsSearch" 
										   placeholder="Поиск скидки..."
										   @keydown.enter.prevent="searchDiscounts">
									<button class="btn btn-outline-primary" 
											type="button"
											@click="searchDiscounts">
										Найти
									</button>
								</div>
								
								<div class="card">
									<div class="card-body p-0">
										<div class="table-responsive">
											<table class="table align-middle mb-0">
												<thead>
													<tr>
														<th>ID</th>
														<th>Название</th>
														<th>%</th>
														<th>Активна</th>
														<th>Период</th>
														<th>Выбрать</th>
													</tr>
												</thead>
												<tbody>
													<tr v-if="discountsItems.length === 0 && loadingDiscounts">
														<td colspan="6" class="text-center text-muted py-4">Загрузка...</td>
													</tr>
													<tr v-else-if="discountsItems.length === 0 && !loadingDiscounts">
														<td colspan="6" class="text-center text-muted py-4">Нет скидок</td>
													</tr>
													<tr v-else v-for="d in filteredDiscounts" :key="d.id">
														<td class="align-middle">{{ d.id }}</td>
														<td class="align-middle">{{ d.name }}</td>
														<td class="align-middle">{{ d.discount_percent }}%</td>
														<td class="align-middle">{{ d.is_active ? 'Да' : 'Нет' }}</td>
														<td class="align-middle">{{ (d.start_date || '').slice(0,16).replace('T',' ') }} — {{ (d.end_date || '').slice(0,16).replace('T',' ') }}</td>
														<td class="align-middle">
															<div class="form-check m-0">
																<input class="form-check-input" type="radio" name="href-radio" :checked="selectedHrefType==='discount' && selectedHrefId===d.id" @change="selectDiscount(d)">
															</div>
														</td>
													</tr>
												</tbody>
											</table>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div class="modal-footer">
						<button type="button" 
								class="btn btn-primary" 
								@click="selectHref"
								:disabled="!selectedHrefType || !selectedHrefId">
							Выбрать
						</button>
						<button type="button" class="btn btn-secondary" @click="showHrefModal = false">
							Закрыть
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.carousel-image-list {
	display: flex;
	flex-direction: column;
	gap: 18px;
	width: 100%;
}

.carousel-image-card {
	border: 2px solid #eee;
	border-radius: 12px;
	padding: 14px 18px;
	width: 100%;
	min-height: 140px;
	text-align: left;
	position: relative;
	background: #fafafa;
	box-shadow: 0 2px 12px rgba(0,0,0,0.04);
	cursor: grab;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-start;
	overflow: hidden;
	gap: 18px;
}

.carousel-image-card:hover {
	box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}

.carousel-image-card img {
	width: 140px;
	height: 100px;
	border-radius: 8px;
	object-fit: cover;
	background: #f0f0f0;
	flex-shrink: 0;
	margin-bottom: 0;
}

.carousel-image-card .remove-btn {
	position: absolute;
	top: 8px; right: 8px;
	background: #dc3545;
	color: #fff;
	border: none;
	border-radius: 50%;
	width: 32px; height: 32px;
	font-size: 20px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2;
	box-shadow: 0 2px 6px rgba(0,0,0,0.07);
	transition: background 0.15s;
}

.carousel-image-card .remove-btn:hover {
	background: #b52a37;
}

.carousel-image-card .carousel-content {
	display: flex;
	flex-direction: column;
	flex: 1 1 0;
	min-width: 0;
	gap: 8px;
}

.carousel-image-card .href-label {
	background: #198754;
	color: #fff;
	border-radius: 6px;
	font-size: 15px;
	padding: 4px 12px;
	max-width: 420px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	display: inline-block;
	box-sizing: border-box;
}

.carousel-image-card .carousel-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	justify-content: flex-start;
	width: 100%;
	box-sizing: border-box;
	padding-bottom: 2px;
}

.carousel-image-card .carousel-action-btn {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 15px;
	padding: 6px 14px;
	border-radius: 6px;
	border: 1px solid #dee2e6;
	background: #fff;
	color: #333;
	cursor: pointer;
	transition: background 0.15s, color 0.15s;
	font-weight: 500;
	min-width: 0;
	max-width: 100%;
	flex: 1 1 120px;
	box-sizing: border-box;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.carousel-image-card .carousel-action-btn:hover {
	background: #f1f3f5;
	color: #0d6efd;
	border-color: #b6d4fe;
}

.carousel-image-card .carousel-action-btn.danger {
	background: #fff0f1;
	color: #dc3545;
	border-color: #f5c2c7;
}

.carousel-image-card .carousel-action-btn.danger:hover {
	background: #f8d7da;
	color: #a71d2a;
}

.add-carousel-image-btn {
	min-height: 120px;
	width: 100%;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-start;
	gap: 18px;
	border-style: dashed;
	cursor: pointer;
}

.add-carousel-image-btn > div {
	margin-bottom: 0;
}

.add-carousel-image-btn:hover {
	border-color: #007bff;
	background: #f8f9fa;
}

/* Modal styles */
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

.modal-dialog {
	z-index: 1055;
	position: relative;
}

.modal-content {
	z-index: 1056;
	position: relative;
}

/* Tab styles */
.nav-tabs .nav-link {
	cursor: pointer;
}

.nav-tabs .nav-link.active {
	font-weight: 500;
}

/* Table styles */
.table th {
	border-top: none;
	font-weight: 600;
}

.table td {
	vertical-align: middle;
}

/* Product image clickable */
.ratio {
	cursor: pointer;
	transition: opacity 0.2s;
}

.ratio:hover {
	opacity: 0.8;
}

/* Button styles */
.btn-sm {
	font-size: 0.875rem;
	padding: 0.25rem 0.5rem;
}

/* Form controls */
.form-select-sm {
	font-size: 0.875rem;
	padding: 0.25rem 0.5rem;
}

.input-group-sm .form-control {
	font-size: 0.875rem;
	padding: 0.25rem 0.5rem;
}

.input-group-sm .btn {
	font-size: 0.875rem;
	padding: 0.25rem 0.5rem;
}
</style> 