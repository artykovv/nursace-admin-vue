<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const productId = Number(route.params.id)

const loading = ref(true)
const error = ref('')
const product = ref(null)
const dicts = ref({ categories: [], manufacturers: [], collections: [], seasons: [], sexes: [], colors: [], materials: [] })

async function fetchJSON(url) {
	const res = await fetch(url, { headers: { 'accept': 'application/json' } })
	if (!res.ok) throw new Error('Failed')
	return res.json()
}

async function loadData() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const [p, categories, manufacturers, collections, seasons, sexes, colors, materials] = await Promise.all([
			fetchJSON(`${siteUrl}/products/${productId}`),
			fetchJSON(`${siteUrl}/categories/`),
			fetchJSON(`${siteUrl}/manufacturers/`),
			fetchJSON(`${siteUrl}/collections/`),
			fetchJSON(`${siteUrl}/seasons/`),
			fetchJSON(`${siteUrl}/sexes/`),
			fetchJSON(`${siteUrl}/colors/`),
			fetchJSON(`${siteUrl}/materials/`)
		])
		product.value = p
		dicts.value = { categories, manufacturers, collections, seasons, sexes, colors, materials }
	} catch (e) {
		error.value = 'Ошибка загрузки товара или справочников'
	} finally {
		loading.value = false
	}
}

function toNumberOrNull(v) {
	if (v === '' || v === null || v === undefined) return null
	const n = Number(v)
	return Number.isNaN(n) ? null : n
}

async function onSubmit(e) {
	e.preventDefault()
	if (!product.value) return
	const fd = new FormData(e.target)
	const payload = {}
	const fields = ['good_name','articul','description','product_size','warehouse_quantity','retail_price','retail_price_with_discount','category_id','manufacturer_id','collection_id','season_id','sex_id','color_id','material_id']
	for (const key of fields) {
		let value = fd.get(key)
		if (['warehouse_quantity','retail_price','retail_price_with_discount','category_id','manufacturer_id','collection_id','season_id','sex_id','color_id','material_id'].includes(key)) {
			value = toNumberOrNull(value)
		}
		const initial = product.value[key] ?? null
		if (value !== initial) payload[key] = value
	}
	if (Object.keys(payload).length === 0) {
		alert('Изменений не обнаружено')
		return
	}
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetch(`${siteUrl}/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
		if (!res.ok) throw new Error('save failed')
		router.push(`/products/${productId}`)
	} catch (e) {
		alert('Ошибка при сохранении')
	}
}

onMounted(loadData)
</script>

<template>
	<div class="container my-4">
		<div class="mb-3">
			<router-link :to="`/products/${productId}`" class="btn btn-link">← К товару</router-link>
		</div>
		<h2>Изменить товар #{{ productId }}</h2>
		<div v-if="loading" class="text-center text-muted py-4">Загрузка...</div>
		<div v-else-if="error" class="alert alert-danger">{{ error }}</div>
		<div v-else>
			<form class="mt-4" @submit="onSubmit">
				<div class="row">
					<div class="col-md-6">
						<div class="mb-2">
							<label class="form-label">Название</label>
							<input type="text" class="form-control" name="good_name" :value="product.good_name || ''" required>
						</div>
						<div class="mb-2">
							<label class="form-label">Артикул</label>
							<input type="text" class="form-control" name="articul" :value="product.articul || ''">
						</div>
						<div class="mb-2">
							<label class="form-label">Описание</label>
							<textarea class="form-control" name="description">{{ product.description || '' }}</textarea>
						</div>
						<div class="mb-2">
							<label class="form-label">Размер</label>
							<input type="text" class="form-control" name="product_size" :value="product.product_size || ''">
						</div>
						<div class="mb-2">
							<label class="form-label">В наличии</label>
							<input type="number" class="form-control" name="warehouse_quantity" :value="product.warehouse_quantity || 0">
						</div>
					</div>
					<div class="col-md-6">
						<div class="mb-2">
							<label class="form-label">Цена</label>
							<input type="number" class="form-control" name="retail_price" :value="product.retail_price || ''" required>
						</div>
						<div class="mb-2">
							<label class="form-label">Цена со скидкой</label>
							<input type="number" class="form-control" name="retail_price_with_discount" :value="product.retail_price_with_discount || ''">
						</div>
						<div class="mb-2">
							<label class="form-label">Категория</label>
							<select class="form-select" name="category_id" :value="product.category_id">
								<option v-for="c in dicts.categories" :key="c.id" :value="c.id">{{ c.category_name }}</option>
							</select>
						</div>
						<div class="mb-2">
							<label class="form-label">Бренд</label>
							<select class="form-select" name="manufacturer_id" :value="product.manufacturer_id">
								<option v-for="m in dicts.manufacturers" :key="m.id" :value="m.id">{{ m.manufacturer_name }}</option>
							</select>
						</div>
						<div class="mb-2">
							<label class="form-label">Коллекция</label>
							<select class="form-select" name="collection_id" :value="product.collection_id">
								<option v-for="c in dicts.collections" :key="c.id" :value="c.id">{{ c.collection_name }}</option>
							</select>
						</div>
						<div class="mb-2">
							<label class="form-label">Сезон</label>
							<select class="form-select" name="season_id" :value="product.season_id">
								<option v-for="s in dicts.seasons" :key="s.id" :value="s.id">{{ s.season_name }}</option>
							</select>
						</div>
						<div class="mb-2">
							<label class="form-label">Пол</label>
							<select class="form-select" name="sex_id" :value="product.sex_id">
								<option v-for="s in dicts.sexes" :key="s.id" :value="s.id">{{ s.sex_name }}</option>
							</select>
						</div>
						<div class="mb-2">
							<label class="form-label">Цвет</label>
							<select class="form-select" name="color_id" :value="product.color_id">
								<option v-for="c in dicts.colors" :key="c.id" :value="c.id">{{ c.color_name }}</option>
							</select>
						</div>
						<div class="mb-2">
							<label class="form-label">Материал</label>
							<select class="form-select" name="material_id" :value="product.material_id">
								<option v-for="m in dicts.materials" :key="m.id" :value="m.id">{{ m.material_name }}</option>
							</select>
						</div>
					</div>
				</div>
				<button type="submit" class="btn btn-success mt-3">Сохранить</button>
				<router-link :to="`/products/${productId}`" class="btn btn-secondary mt-3 ms-2">Отмена</router-link>
			</form>
		</div>
	</div>
</template>

<style scoped>
</style> 