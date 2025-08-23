<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCookie } from '../../utils/http'

const route = useRoute()
const router = useRouter()
const productId = ref(Number(route.params.id))

const loading = ref(true)
const error = ref('')
const product = ref(null)
const category = ref(null)
const manufacturer = ref(null)
const collection = ref(null)
const season = ref(null)
const sex = ref(null)
const color = ref(null)
const material = ref(null)

const PLACEHOLDER_IMAGE = 'https://placehold.co/1000x1000'
const productHasDiscount = ref(false)
const colorsCache = ref([])
const discountsCache = ref([])
const currentProductColorId = ref(null)
const currentProductDiscountId = ref(null)
const modalSelectedColorId = ref(null)
const modalSelectedDiscountId = ref(null)
const modalColorSearch = ref('')
const modalDiscountSearch = ref('')

// Similar products for switching
const similarProducts = ref([])
const currentProductIndex = ref(0)

// Computed properties
const carouselImages = computed(() => {
	const imgs = product.value?.images || []
	return imgs.length > 0 ? imgs : [{ image_url: PLACEHOLDER_IMAGE }]
})

const placeholderImage = computed(() => PLACEHOLDER_IMAGE)

// Get unique sizes and colors from similar products
const availableSizes = computed(() => {
	const sizes = similarProducts.value.map(p => p.product_size).filter(Boolean)
	return [...new Set(sizes)].sort((a, b) => a - b)
})

const availableColors = computed(() => {
	const colors = similarProducts.value.map(p => p.color).filter(Boolean)
	return [...new Set(colors.map(c => c.color_id))].map(colorId => {
		const color = colors.find(c => c.color_id === colorId)
		return {
			color_id: color.color_id,
			color_name: color.color_name,
			color_hex: colorsCache.value.find(c => c.color_id === color.color_id)?.color_hex
		}
	})
})

// Check if current product has variants
const hasVariants = computed(() => similarProducts.value.length > 1)

function getValidHexOrDefault(hex, def = '#000000') {
	if (!hex || typeof hex !== 'string') return def
	let h = hex.trim()
	if (!h.startsWith('#')) h = '#' + h
	if (h.length === 4) {
		h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
	}
	if (/^#([0-9a-fA-F]{6})$/.test(h)) return h.toUpperCase()
	return def
}

async function fetchJSON(url, withAuth = false) {
	const headers = { 'accept': 'application/json' }
	if (withAuth) {
		const token = getCookie('Bearer')
		if (token) headers['Authorization'] = `Bearer ${token}`
	}
	const response = await fetch(url, { headers })
	if (!response.ok) throw new Error(`Failed to fetch ${url}`)
	return response.json()
}

async function safeFetchJSON(url, withAuth = false) {
	try {
		return await fetchJSON(url, withAuth)
	} catch (err) {
		return null
	}
}

function setMetaTags(product) {
	if (product.fashion_name) {
		document.title = product.fashion_name
	}
}

function renderProductDetails(product) {
	const hasDiscount = product.retail_price !== product.retail_price_with_discount
	productHasDiscount.value = !!hasDiscount
	currentProductColorId.value = product.color_id || null
}

async function switchToVariant(size, colorId) {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		// Find the variant with specified size and color
		let variant = similarProducts.value.find(p => 
			p.product_size === size && p.color?.color_id === colorId
		)
		// Fallback: find by size only if exact color match not found
		if (!variant) {
			variant = similarProducts.value.find(p => p.product_size === size)
		}
		
		if (variant && variant.good_id !== productId.value) {
			// Navigate to the variant
			await router.push(`/products/${variant.good_id}`)
		}
	} catch (e) {
		console.error('Error switching variant:', e)
	}
}

async function loadSimilarProducts(id = productId.value) {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const similar = await fetchJSON(`${siteUrl}/products/${id}/similar`)
		similarProducts.value = similar || []
		
		// Find current product index in similar products
		const currentIndex = similarProducts.value.findIndex(p => p.good_id === id)
		currentProductIndex.value = currentIndex >= 0 ? currentIndex : 0
	} catch (e) {
		similarProducts.value = []
		currentProductIndex.value = 0
	}
}

async function loadProductDetails(productId) {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const productData = await fetchJSON(`${siteUrl}/products/${productId}`)
		product.value = productData
		setMetaTags(productData)
		renderProductDetails(productData)
		
		// Ensure product has at least one image
		if (!productData.images || productData.images.length === 0) {
			product.value.images = [{ image_url: PLACEHOLDER_IMAGE }]
		}
		
		const [cat, man, coll, sea, sx, col, mat] = await Promise.all([
			(productData.category_id ? safeFetchJSON(`${siteUrl}/categories/${productData.category_id}`) : Promise.resolve(null)),
			(productData.manufacturer_id ? safeFetchJSON(`${siteUrl}/manufacturers/${productData.manufacturer_id}`) : Promise.resolve(null)),
			(productData.collection_id ? safeFetchJSON(`${siteUrl}/collections/${productData.collection_id}`) : Promise.resolve(null)),
			(productData.season_id ? safeFetchJSON(`${siteUrl}/seasons/${productData.season_id}`) : Promise.resolve(null)),
			(productData.sex_id ? safeFetchJSON(`${siteUrl}/sexes/${productData.sex_id}`) : Promise.resolve(null)),
			(productData.color_id ? safeFetchJSON(`${siteUrl}/colors/${productData.color_id}`) : Promise.resolve(null)),
			(productData.material_id ? safeFetchJSON(`${siteUrl}/materials/${productData.material_id}`) : Promise.resolve(null))
		])
		
		category.value = cat
		manufacturer.value = man
		collection.value = coll
		season.value = sea
		sex.value = sx
		color.value = col
		material.value = mat
	} catch (err) {
		error.value = 'Ошибка загрузки товара'
		product.value = {
			good_name: 'Error loading product',
			retail_price: 0,
			retail_price_with_discount: 0,
			articul: '—',
			images: [{ image_url: PLACEHOLDER_IMAGE }]
		}
	} finally {
		loading.value = false
	}
}

// Colors: list/search/create
function renderModalColors() {
	const search = modalColorSearch.value.trim().toLowerCase()
	const items = colorsCache.value.filter(c => !search || (c.color_name || '').toLowerCase().includes(search))
	return items
}

function updateEditSelectedColorSection() {
	if (!modalSelectedColorId.value) return
	const selected = colorsCache.value.find(c => c.color_id === modalSelectedColorId.value)
	if (selected) {
		// Update the edit form fields
		const nameEl = document.getElementById('modalEditColorName')
		const hexEl = document.getElementById('modalEditColorHex')
		if (nameEl) nameEl.value = selected.color_name || ''
		if (hexEl) hexEl.value = getValidHexOrDefault(selected.color_hex || '#000000')
	}
}

function openSelectColorModal() {
	const m = new window.bootstrap.Modal(document.getElementById('selectColorModal'))
	modalSelectedColorId.value = currentProductColorId.value
	modalColorSearch.value = ''
	const createSec = document.getElementById('modalCreateSection')
	const editSec = document.getElementById('modalEditSection')
	if (createSec) createSec.style.display = 'none'
	if (editSec) editSec.style.display = 'none'
	// Update edit section if color is selected
	if (modalSelectedColorId.value) {
		updateEditSelectedColorSection()
	}
	m.show()
}

function openCreateColorForm() {
	const createSec = document.getElementById('modalCreateSection')
	const editSec = document.getElementById('modalEditSection')
	if (createSec) createSec.style.display = ''
	if (editSec) editSec.style.display = 'none'
	const newNameEl = document.getElementById('modalNewColorName')
	const newHexEl = document.getElementById('modalNewColorHex')
	if (newNameEl) newNameEl.value = ''
	if (newHexEl) newHexEl.value = '#000000'
}

function openEditColorForm() {
	if (!modalSelectedColorId.value) return
	const createSec = document.getElementById('modalCreateSection')
	const editSec = document.getElementById('modalEditSection')
	if (createSec) createSec.style.display = 'none'
	if (editSec) editSec.style.display = ''
	updateEditSelectedColorSection()
}

async function refreshColorsFromServer(keepSelectedId = null) {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const colors = await fetchJSON(`${siteUrl}/colors/`)
		colorsCache.value = colors || []
		if (keepSelectedId !== undefined && keepSelectedId !== null) {
			modalSelectedColorId.value = keepSelectedId
		}
	} catch {}
}

async function modalCreateAndSelectColor() {
	const nameEl = document.getElementById('modalNewColorName')
	const hexEl = document.getElementById('modalNewColorHex')
	const name = (nameEl?.value || '').trim()
	const hex = getValidHexOrDefault(hexEl?.value || '#000000')
	if (!name) { alert('Укажите название цвета'); return }
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/colors/`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
			body: JSON.stringify({ color_name: name, color_hex: hex })
		})
		if (!res.ok) {
			const t = await res.text()
			throw new Error(t || 'Ошибка создания цвета')
		}
		const created = await res.json()
		await refreshColorsFromServer(created.color_id)
		openEditColorForm()
	} catch (e) {
		alert('Ошибка: ' + (e?.message || 'Не удалось создать цвет'))
	}
}

async function modalSaveSelectedColor() {
	const token = getCookie('Bearer')
	const headers = { 'Content-Type': 'application/json', 'accept': 'application/json' }
	if (token) headers['Authorization'] = `Bearer ${token}`
	const payload = modalSelectedColorId.value ? { color_id: modalSelectedColorId.value } : { color_id: null }
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/products/${productId.value}`, {
			method: 'PUT',
			headers,
			body: JSON.stringify(payload)
		})
		if (!res.ok) {
			const t = await res.text()
			throw new Error(t || 'Не удалось сохранить цвет')
		}
		currentProductColorId.value = modalSelectedColorId.value || null
		const selected = colorsCache.value.find(c => c.color_id === currentProductColorId.value)
		// Update the UI
		color.value = selected
		window.bootstrap.Modal.getInstance(document.getElementById('selectColorModal')).hide()
	} catch (e) {
		alert('Ошибка: ' + (e?.message || 'Не удалось сохранить цвет'))
	}
}

async function modalEditSaveColor() {
	const selected = colorsCache.value.find(c => c.color_id === modalSelectedColorId.value)
	if (!selected) return
	const nameEl = document.getElementById('modalEditColorName')
	const hexEl = document.getElementById('modalEditColorHex')
	const name = nameEl?.value || ''
	const hex = getValidHexOrDefault(hexEl?.value || '#000000')
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/colors/${selected.color_id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
			body: JSON.stringify({ color_name: name || undefined, color_hex: hex || undefined })
		})
		if (!res.ok) {
			const t = await res.text()
			throw new Error(t || 'Не удалось сохранить цвет')
		}
		await refreshColorsFromServer(selected.color_id)
		if (currentProductColorId.value === selected.color_id) {
			const updated = colorsCache.value.find(c => c.color_id === selected.color_id)
			color.value = updated
		}
	} catch (e) {
		alert('Ошибка: ' + (e?.message || 'Не удалось сохранить цвет'))
	}
}

async function modalEditDeleteColor() {
	const selected = colorsCache.value.find(c => c.color_id === modalSelectedColorId.value)
	if (!selected) return
	if (!confirm('Удалить выбранный цвет?')) return
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/colors/${selected.color_id}`, {
			method: 'DELETE',
			headers: { 'accept': 'application/json' }
		})
		if (!res.ok) {
			let msg = 'Ошибка удаления цвета'
			try {
				const data = await res.json()
				if (data?.detail) msg = data.detail
			} catch {}
			alert(msg)
			return
		}
		await refreshColorsFromServer(null)
		const createSec = document.getElementById('modalCreateSection')
		const editSec = document.getElementById('modalEditSection')
		if (editSec) editSec.style.display = 'none'
		if (createSec) createSec.style.display = 'none'
		if (currentProductColorId.value === selected.color_id) {
			currentProductColorId.value = null
			color.value = null
		}
	} catch (e) {
		alert('Ошибка: ' + (e?.message || 'Не удалось удалить цвет'))
	}
}

function modalClearColor() {
	modalSelectedColorId.value = null
}

// Discounts modal
function renderModalDiscounts() {
	const search = modalDiscountSearch.value.trim().toLowerCase()
	const items = discountsCache.value.filter(d => !search || (d.name || '').toLowerCase().includes(search))
	return items
}

async function findCurrentDiscountIdForProduct() {
	currentProductDiscountId.value = null
	const siteUrl = window.AppConfig?.siteUrl || ''
	for (const d of discountsCache.value) {
		try {
			const prods = await fetchJSON(`${siteUrl}/discounts/${d.id}/products`)
			if (Array.isArray(prods) && prods.some(p => String(p.good_id) === String(productId.value))) {
				currentProductDiscountId.value = d.id
				break
			}
		} catch {}
	}
}

async function openSelectDiscountModal() {
	const m = new window.bootstrap.Modal(document.getElementById('selectDiscountModal'))
	try {
		if (!discountsCache.value.length) {
			const siteUrl = window.AppConfig?.siteUrl || ''
			discountsCache.value = await fetchJSON(`${siteUrl}/discounts/`)
		}
		if (productHasDiscount.value && currentProductDiscountId.value == null) {
			await findCurrentDiscountIdForProduct()
		}
	} catch {}
	modalSelectedDiscountId.value = currentProductDiscountId.value
	modalDiscountSearch.value = ''
	m.show()
}

async function modalSaveSelectedDiscount() {
	try {
		// No change
		if (modalSelectedDiscountId.value === currentProductDiscountId.value) {
			window.bootstrap.Modal.getInstance(document.getElementById('selectDiscountModal')).hide()
			return
		}
		const siteUrl = window.AppConfig?.siteUrl || ''
		// Remove from current if set
		if (currentProductDiscountId.value != null) {
			await fetch(`${siteUrl}/discounts/${currentProductDiscountId.value}/products`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
				body: JSON.stringify({ product_ids: [parseInt(productId.value, 10)] })
			})
		}
		// Add to selected if set
		if (modalSelectedDiscountId.value != null) {
			const res = await fetch(`${siteUrl}/discounts/${modalSelectedDiscountId.value}/products`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
				body: JSON.stringify({ product_ids: [parseInt(productId.value, 10)] })
			})
			if (!res.ok) {
				const t = await res.text()
				throw new Error(t || 'Не удалось добавить товар в скидку')
			}
			currentProductDiscountId.value = modalSelectedDiscountId.value
		} else {
			currentProductDiscountId.value = null
		}
		// Refresh product details to update prices/flags
		await loadProductDetails(productId.value)
		window.bootstrap.Modal.getInstance(document.getElementById('selectDiscountModal')).hide()
	} catch (e) {
		alert('Ошибка: ' + (e?.message || 'Не удалось сохранить скидку'))
	}
}

function modalClearDiscount() {
	modalSelectedDiscountId.value = null
}

async function loadColors() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const colors = await fetchJSON(`${siteUrl}/colors/`)
		colorsCache.value = colors || []
	} catch {}
}

async function loadDiscounts() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const discounts = await fetchJSON(`${siteUrl}/discounts/`)
		discountsCache.value = discounts || []
	} catch {}
}

// Watch for route changes to reload similar products
watch(() => route.params.id, async (newId) => {
	if (newId && Number(newId) !== productId.value) {
		// Reset state for new product
		loading.value = true
		error.value = ''
		product.value = null
		category.value = null
		manufacturer.value = null
		collection.value = null
		season.value = null
		sex.value = null
		color.value = null
		material.value = null
		similarProducts.value = []
		currentProductIndex.value = 0
		
		// Load new product data
		productId.value = Number(newId)
		await loadProductDetails(productId.value)
		await loadSimilarProducts(productId.value)
	}
})

onMounted(async () => {
	await loadProductDetails(productId.value)
	await loadColors()
	await loadDiscounts()
	await loadSimilarProducts(productId.value)
})
</script>

<template>
	<div class="container">
		<div class="row">
			<div class="col-md-6">
				<div class="Product-Images">
					<div id="carouselProductImages" class="carousel slide">
						<div class="carousel-indicators">
							<button v-for="(img, idx) in carouselImages" :key="idx" type="button" data-bs-target="#carouselProductImages" :data-bs-slide-to="idx" :class="{ active: idx===0 }" :aria-label="`Slide ${idx+1}`" :aria-current="idx===0 ? 'true' : undefined"></button>
						</div>
						<div class="carousel-inner">
							<div v-for="(img, idx) in carouselImages" :key="idx" class="carousel-item" :class="{ active: idx===0 }">
								<img :src="img.image_url || placeholderImage" 
									 class="d-block w-100" 
									 :alt="product?.good_name || 'Product image'"
									 @error="$event.target.src = placeholderImage" />
							</div>
						</div>
						<button class="carousel-control-prev" type="button" data-bs-target="#carouselProductImages" data-bs-slide="prev">
							<span class="carousel-control-prev-icon" aria-hidden="true"></span>
							<span class="visually-hidden">Previous</span>
						</button>
						<button class="carousel-control-next" type="button" data-bs-target="#carouselProductImages" data-bs-slide="next">
							<span class="carousel-control-next-icon" aria-hidden="true"></span>
							<span class="visually-hidden">Next</span>
						</button>
					</div>
					<div class="mt-3 text-center">
						<router-link :to="`/products/${productId}/image`" class="btn btn-warning w-100">Изменить</router-link>
					</div>
				</div>
			</div>
			<div class="offset-xl-1 pt-4 col-xl-5 col-md-6">
				<div class="Product-Info">
					<table>
						<tbody>
							<tr><th>Название</th><td id="productName">{{ product?.good_name || '—' }}</td></tr>
							<tr><th>Артикул</th><td id="productArticul">{{ product?.articul || '—' }}</td></tr>
							<tr><th>Цена</th><td><span id="newPrice">{{ product?.retail_price }} сом</span></td></tr>
							<tr><th>Цена со скидкой</th><td><span id="oldPrice" class="old_price" :class="{ visible: productHasDiscount }">{{ product?.retail_price_with_discount }} сом</span></td></tr>
							<tr><th>Скидка</th><td><span id="discountBadge" class="product_discount_badge" :class="{ visible: productHasDiscount }">-{{ Math.round(((product?.retail_price - product?.retail_price_with_discount) / product?.retail_price) * 100) }}%</span></td></tr>
							<tr><th>Категория</th><td id="product-category">{{ category?.category_name || '—' }}</td></tr>
							<tr><th>Бренд</th><td id="product-brand">{{ manufacturer?.manufacturer_name || '—' }}</td></tr>
							<tr><th>Коллекция</th><td id="product-collection">{{ collection?.collection_name || '—' }}</td></tr>
							<tr><th>Сезон</th><td id="product-season">{{ season?.season_name || '—' }}</td></tr>
							<tr><th>Пол</th><td id="product-sex">{{ sex?.sex_name || '—' }}</td></tr>
							<tr><th>Цвет</th><td><span id="product-color-swatch" class="swatch" :style="{ background: getValidHexOrDefault(color?.color_hex || '') }"></span><span id="product-color">{{ color?.color_name || '—' }}</span></td></tr>
							<tr><th>Материал</th><td id="product-material">{{ material?.material_name || '—' }}</td></tr>
							<tr><th>Размер</th><td id="product-size">{{ product?.product_size || '—' }}</td></tr>
							<tr><th>Описание</th><td id="product-description">{{ product?.description || '—' }}</td></tr>
							<tr><th>Наличие</th><td id="product-quantity">{{ product?.warehouse_quantity != null ? product?.warehouse_quantity + ' шт' : '—' }}</td></tr>
						</tbody>
					</table>
					<div class="mt-3 d-flex gap-2 justify-content-end">
						<button id="openSelectColorModalBtn" type="button" class="btn btn-outline-primary" @click="openSelectColorModal">Изменить цвет…</button>
						<button id="openSelectDiscountModalBtn" type="button" class="btn btn-outline-primary" @click="openSelectDiscountModal">Изменить скидку…</button>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Product Variants Switcher -->
		<div v-if="hasVariants" class="row mt-4">
			<div class="col-12">
				<div class="card">
					<div class="card-header">
						<h6 class="mb-0">Варианты товара</h6>
					</div>
					<div class="card-body">
						<!-- Size Switcher -->
						<div v-if="availableSizes.length > 1" class="mb-3">
							<label class="form-label fw-semibold">Размер:</label>
							<div class="d-flex flex-wrap gap-2">
								<button v-for="size in availableSizes" 
										:key="size"
										type="button"
										class="btn"
										:class="size === product?.product_size ? 'btn-primary' : 'btn-outline-secondary'"
										@click="switchToVariant(size, product?.color_id)">
									{{ size }}
								</button>
							</div>
						</div>
						
						<!-- Color Switcher -->
						<div v-if="availableColors.length > 1" class="mb-3">
							<label class="form-label fw-semibold">Цвет:</label>
							<div class="d-flex flex-wrap gap-2">
								<button v-for="colorOption in availableColors" 
										:key="colorOption.color_id"
										type="button"
										class="btn d-flex align-items-center gap-2"
										:class="colorOption.color_id === product?.color_id ? 'btn-primary' : 'btn-outline-secondary'"
										@click="switchToVariant(product?.product_size, colorOption.color_id)">
									<span class="swatch" :style="{ background: getValidHexOrDefault(colorOption.color_hex || '') }"></span>
									{{ colorOption.color_name }}
								</button>
							</div>
						</div>
						
						<!-- Current Variant Info -->
						<div class="text-muted small">
							Текущий вариант: {{ product?.product_size || '—' }} размер, {{ color?.color_name || '—' }} цвет
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Select/Create Color Modal -->
	<div class="modal fade" id="selectColorModal" tabindex="-1" aria-hidden="true">
		<div class="modal-dialog modal-dialog-scrollable">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title">Выбор цвета</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body">
					<div class="mb-3">
						<input id="modalColorSearch" v-model="modalColorSearch" type="text" class="form-control" placeholder="Поиск по названию цвета...">
					</div>
					<div id="modalColorsList" class="modal-colors-list">
						<div v-if="!renderModalColors().length" class="text-muted">Нет цветов</div>
						<div v-for="c in renderModalColors()" :key="c.color_id" class="modal-color-item" :class="{ selected: modalSelectedColorId===c.color_id }" @click="modalSelectedColorId = c.color_id; updateEditSelectedColorSection()">
							<div>
								<span class="swatch" :style="{ background: getValidHexOrDefault(c.color_hex || '') }"></span>
								<span>{{ c.color_name }}</span>
							</div>
							<span v-if="modalSelectedColorId===c.color_id" class="badge bg-primary">Выбрано</span>
						</div>
					</div>
					<div class="d-flex justify-content-between align-items-center mt-3">
						<button id="modalOpenEditBtn" type="button" class="btn btn-outline-secondary" :disabled="!modalSelectedColorId" @click="openEditColorForm">Изменить</button>
						<button id="modalOpenCreateBtn" type="button" class="btn btn-success" @click="openCreateColorForm">+</button>
					</div>
					<hr/>
					<div id="modalCreateSection" class="row g-2 align-items-center mb-2" style="display:none;">
						<div class="col-12 col-md-7">
							<input id="modalNewColorName" type="text" class="form-control" placeholder="Название нового цвета">
						</div>
						<div class="col-6 col-md-3">
							<input id="modalNewColorHex" type="color" class="form-control form-control-color" value="#000000" title="Выберите цвет">
						</div>
						<div>
							<button id="modalCreateAndSelectBtn" type="button" class="btn btn-success w-100" @click="modalCreateAndSelectColor">Создать</button>
						</div>
					</div>
					<hr/>
					<div class="mb-2 fw-semibold">Редактировать выбранный</div>
					<div id="modalEditSection" class="row g-2 align-items-center" style="display:none;">
						<div class="col-12 col-md-7">
							<input id="modalEditColorName" type="text" class="form-control" placeholder="Название цвета" :disabled="!modalSelectedColorId">
						</div>
						<div class="col-6 col-md-3">
							<input id="modalEditColorHex" type="color" class="form-control form-control-color" value="#000000" title="Цвет" :disabled="!modalSelectedColorId">
						</div>
						<div>
							<div>
								<button id="modalEditColorSaveBtn" type="button" class="btn btn-primary w-100" :disabled="!modalSelectedColorId" @click="modalEditSaveColor">Сохранить</button>
							</div>
							<div>
								<button id="modalEditColorDeleteBtn" type="button" class="btn btn-outline-danger btn-sm w-100 mt-2" @click="modalEditDeleteColor">Удалить цвет</button>
							</div>
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-outline-secondary" id="modalClearColorBtn" @click="modalClearColor">Очистить</button>
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
					<button type="button" class="btn btn-primary" id="modalSaveColorBtn" :disabled="modalSelectedColorId===currentProductColorId" @click="modalSaveSelectedColor">Сохранить</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Select Discount Modal -->
	<div class="modal fade" id="selectDiscountModal" tabindex="-1" aria-hidden="true">
		<div class="modal-dialog modal-dialog-scrollable">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title">Выбор скидки</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body">
					<div class="mb-3">
						<input id="modalDiscountSearch" v-model="modalDiscountSearch" type="text" class="form-control" placeholder="Поиск по названию скидки...">
					</div>
					<div id="modalDiscountsList" class="modal-discounts-list">
						<div v-if="!renderModalDiscounts().length" class="text-muted">Нет скидок</div>
						<div v-for="d in renderModalDiscounts()" :key="d.id" class="modal-discount-item" :class="{ selected: modalSelectedDiscountId===d.id }" @click="modalSelectedDiscountId = d.id">
							<div>
								<strong>{{ d.name }}</strong> <span class="text-muted">({{ d.discount_percent }}%)</span> <span class="badge ms-2" :class="d.is_active ? 'bg-success' : 'bg-secondary'">{{ d.is_active ? 'Активна' : 'Неактивна' }}</span>
							</div>
							<span v-if="modalSelectedDiscountId===d.id" class="badge bg-primary">Выбрано</span>
						</div>
					</div>
					<div class="form-text mt-2">Выберите одну скидку. Товар может быть только в одной скидке одновременно.</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-outline-secondary" id="modalClearDiscountBtn" @click="modalClearDiscount">Очистить</button>
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
					<button type="button" class="btn btn-primary" id="modalSaveDiscountBtn" :disabled="modalSelectedDiscountId===currentProductDiscountId" @click="modalSaveSelectedDiscount">Сохранить</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style>
.carousel-control-prev-icon,
.carousel-control-next-icon {
	background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23000'%3e%3cpath d='M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z'/%3e%3c/svg%3e");
}
.carousel-control-next-icon {
	background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23000'%3e%3cpath d='M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z'/%3e%3c/svg%3e");
}
.carousel-indicators [data-bs-target] {
	background-color: #000 !important;
}
.carousel-indicators .active {
	background-color: #000 !important;
	opacity: 1 !important;
}
.carousel-item img {
	border-radius: 16px;
}
.Product-Info table {
	width: 100%;
	max-width: 600px;
	margin-top: 20px;
}
.Product-Info th, .Product-Info td {
	padding: 8px;
	text-align: left;
	vertical-align: top;
}
.Product-Info th {
	font-weight: bold;
	width: 30%;
}
.product_discount_badge {
	display: inline-block;
	min-width: 60px;
	min-height: 24px;
	visibility: hidden;
}
.old_price {
	min-width: 100px;
	min-height: 24px;
	visibility: hidden;
}
.product_discount_badge.visible {
	visibility: visible;
}
.old_price.visible {
	visibility: visible;
}
.swatch {
	display: inline-block;
	width: 16px;
	height: 16px;
	border-radius: 4px;
	border: 1px solid #ccc;
	vertical-align: middle;
	margin-right: 8px;
}
.modal-colors-list, .modal-discounts-list {
	max-height: 280px;
	overflow: auto;
	border: 1px solid #eee;
	border-radius: 8px;
	padding: 6px;
}
.modal-color-item, .modal-discount-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 10px;
	border-radius: 6px;
	cursor: pointer;
}
.modal-color-item:hover, .modal-discount-item:hover {
	background: #f7f7f7;
}
.modal-color-item.selected, .modal-discount-item.selected {
	background: #e8f0fe;
	outline: 1px solid #c7dafc;
}
</style> 