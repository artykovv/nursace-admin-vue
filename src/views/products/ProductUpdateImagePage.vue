<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCookie } from '../../utils/http'

const route = useRoute()
const router = useRouter()
const productId = Number(route.params.id)

const loading = ref(true)
const error = ref('')
const images = ref([]) // {image_id,image_url,is_main,is_new:false}
const newImages = ref([]) // {image_id,image_url,is_main,is_new:true}
const uploadBusy = ref(false)
const dragIdx = ref(null)
const uploadAreaDragover = ref(false)

const PLACEHOLDER_IMAGE = 'https://placehold.co/160x120'

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

async function fetchImages() {
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetchWithAuth(`${siteUrl}/products/${productId}`)
		if (!res.ok) throw new Error('Ошибка загрузки товара')
		const product = await res.json()
		
		// Clear and reload images (sorted by order)
		images.value = (product.images || [])
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map(img => ({
			image_id: img.image_id,
			image_url: img.image_url,
			is_main: !!img.is_main,
			is_new: false
		}))
		
		// Clear new images
		newImages.value = []
	} catch (e) {
		error.value = 'Ошибка загрузки товара'
		images.value = []
		newImages.value = []
	}
}

async function loadData() {
	try {
		loading.value = true
		error.value = ''
		// Clear arrays before loading
		images.value = []
		newImages.value = []
		await fetchImages()
	} catch (e) {
		error.value = 'Ошибка загрузки товара'
	} finally {
		loading.value = false
	}
}

const allImages = computed(() => [...images.value, ...newImages.value])

const placeholderImage = computed(() => PLACEHOLDER_IMAGE)

function setMain(idx) {
	const all = [...allImages.value]
	if (idx == null || idx < 0 || idx >= all.length) return
	
	// Take selected image out
	const [selected] = all.splice(idx, 1)
	
	// Reset main flags
	all.forEach(i => i.is_main = false)
	selected.is_main = true
	
	// Place selected at the beginning
	const reordered = [selected, ...all]
	
	// Update both arrays
	images.value = reordered.filter(i => !i.is_new)
	newImages.value = reordered.filter(i => i.is_new)
}

function removeImage(idx) {
	const all = [...allImages.value]
	const img = all[idx]
	if (!img) return
	
	// Remove from appropriate array
	if (img.is_new) {
		newImages.value = newImages.value.filter(i => i !== img)
	} else {
		// For existing images, we'll use the delete API instead
		// This function is now mainly for drag & drop reordering
		return
	}
	
	// Update images array
	images.value = all.filter(i => !i.is_new)
	
	// If we removed the main image, make the first remaining image main
	if (allImages.value.length > 0 && !allImages.value.some(i => i.is_main)) {
		if (allImages.value.length > 0) {
			allImages.value[0].is_main = true
		}
	}
}



function onFileSelect(e) {
	const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'))
	if (files.length === 0) return
	
	handleFiles(files)
	// Reset file input
	e.target.value = ''
}

async function deleteImage(imageId) {
	if (!imageId) {
		alert('Ошибка: не указан ID изображения')
		return
	}
	
	// If it's a newly added (unsaved) image, remove locally without API call
	const local = allImages.value.find(img => img.image_id === imageId)
	if (local && local.is_new) {
		newImages.value = newImages.value.filter(img => img.image_id !== imageId)
		// Ensure there is a main image
		if (allImages.value.length > 0 && !allImages.value.some(img => img.is_main)) {
			if (allImages.value.length > 0) {
				allImages.value[0].is_main = true
			}
		}
		return
	}
	
	if (!confirm('Вы уверены, что хотите удалить это изображение?')) {
		return
	}
	
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		
		const res = await fetchWithAuth(`${siteUrl}/products/${imageId}/images`, {
			method: 'DELETE'
		})
		
		if (res.ok) {
			// Remove from local arrays
			images.value = images.value.filter(img => img.image_id !== imageId)
			newImages.value = newImages.value.filter(img => img.image_id !== imageId)
			
			// If we deleted the main image, make the first remaining image main
			if (allImages.value.length > 0 && !allImages.value.some(img => img.is_main)) {
				if (allImages.value.length > 0) {
					allImages.value[0].is_main = true
				}
			}
		} else {
			const errorText = await res.text()
			alert('Ошибка при удалении: ' + errorText)
		}
	} catch (e) {
		alert('Ошибка при удалении изображения')
	}
}

// Drag and Drop functionality
function onDragStart(idx, e) {
	dragIdx.value = idx
	e.target.classList.add('dragging')
}

function onDragOver(e) {
	e.preventDefault()
	e.currentTarget.style.borderColor = '#007bff'
}

function onDragLeave(e) {
	e.currentTarget.style.borderColor = ''
}

function onDrop(e, idx) {
	e.preventDefault()
	if (dragIdx.value === null || dragIdx.value === idx) return
	
	const all = [...allImages.value]
	const [moved] = all.splice(dragIdx.value, 1)
	all.splice(idx, 0, moved)
	
	// Update both arrays
	images.value = all.filter(i => !i.is_new)
	newImages.value = all.filter(i => i.is_new)
	
	dragIdx.value = null
}

function onDragEnd() {
	dragIdx.value = null
	// Remove dragging class from all elements
	document.querySelectorAll('.product-image-card').forEach(el => {
		el.classList.remove('dragging')
	})
}

async function handleFiles(files) {
	if (uploadBusy.value) return
	uploadBusy.value = true
	
	try {
		const siteUrl = window.AppConfig?.siteUrl || ''
		
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
						image_id: `temp_${Date.now()}_${Math.random()}_${index}`,
						image_url: imageUrl,
						is_main: false,
						is_new: true
					}
					
					newImages.value.push(newImage)
				})
				
				// If this is the first image overall, make it main
				if (allImages.value.length === result.uploaded_urls.length) {
					newImages.value[0].is_main = true
				}
			}
		} else {
			const errorText = await res.text()
			alert('Ошибка при загрузке файлов: ' + errorText)
		}
	} catch (e) {
		alert('Ошибка при загрузке файлов')
	} finally {
		uploadBusy.value = false
	}
}

async function onSave() {
	try {
		const all = allImages.value
		if (all.length === 0) {
			alert('Добавьте хотя бы одно изображение')
			return
		}
		
		// Ensure one image is main
		if (!all.some(i => i.is_main)) {
			all[0].is_main = true
		}
		
		// Remove duplicates by image_url
		const uniqueImages = []
		const seenUrls = new Set()
		for (const img of all) {
			if (!seenUrls.has(img.image_url)) {
				seenUrls.add(img.image_url)
				uniqueImages.push(img)
			}
		}
		
		// Всегда отправляем запрос сохранения
		const siteUrl = window.AppConfig?.siteUrl || ''
		const payload = uniqueImages.map((img, idx) => ({
			image_url: img.image_url,
			is_main: !!img.is_main,
			order: idx
		}))
		
		const res = await fetchWithAuth(`${siteUrl}/products/${productId}/images`, {
			method: 'PUT',
			body: JSON.stringify(payload)
		})
		
		if (res.ok) {
			// After successful save, move all images to existing images array
			// and clear new images array to prevent duplication
			images.value = uniqueImages.map(img => ({
				image_id: img.image_id || `temp_${Date.now()}_${Math.random()}`, // Generate temp ID for new images
				image_url: img.image_url,
				is_main: img.is_main,
				is_new: false
			}))
			newImages.value = []
			
			router.push(`/products/${productId}`)
		} else {
			const errorText = await res.text()
			alert('Ошибка при сохранении: ' + errorText)
		}
	} catch (e) {
		alert('Ошибка при сохранении')
	}
}

onMounted(() => {
	loadData()
})

function onFileDrop(e) {
	e.preventDefault()
	uploadAreaDragover.value = false
	const files = Array.from(e.dataTransfer?.files || []).filter(file => file.type.startsWith('image/'))
	if (files.length === 0) return
	handleFiles(files)
}
</script>

<template>
	<div class="container mt-4">
		<div class="mb-3">
			<router-link :to="`/products/${productId}`" class="btn btn-link">&larr; К товару</router-link>
		</div>
		<h2>Изменить изображения товара #{{ productId }}</h2>
		
		<div v-if="loading" class="text-center text-muted py-4">Загрузка...</div>
		<div v-else>

			
			<div class="product-image-list" id="image-list">
				<div v-for="(img, idx) in allImages" 
					 :key="img.image_id || `new_${idx}`"
					 class="product-image-card"
					 :class="{ 'is-main': img.is_main }"
					 draggable="true"
					 @dragstart="onDragStart(idx, $event)"
					 @dragover="onDragOver($event)"
					 @dragleave="onDragLeave($event)"
					 @drop="onDrop($event, idx)"
					 @dragend="onDragEnd">
					
					<img :src="img.image_url" 
						 :alt="`Изображение ${idx + 1}`"
						 class="product-image"
						 @error="$event.target.src = placeholderImage">
					

					
					<div class="image-actions">
						<button v-if="!img.is_main" 
								class="btn btn-sm btn-outline-primary"
								@click="setMain(idx)">
							Сделать главным
						</button>
						<button v-else 
								class="btn btn-sm btn-success" 
								disabled>
							Главное
						</button>
						
						<button class="btn btn-sm btn-outline-danger"
								@click="deleteImage(img.image_id)">
							Удалить
						</button>
					 </div>
					
					<div v-if="img.is_new" class="new-badge">Новое</div>
				</div>
				
			<div class="upload-area" 
				 @dragover.prevent="uploadAreaDragover = true"
				 @dragleave="uploadAreaDragover = false"
				 @drop="onFileDrop"
				 :class="{ dragover: uploadAreaDragover }">
				<input type="file" 
					   id="file-input" 
					   multiple 
					   accept="image/*" 
					   @change="onFileSelect">
				<label for="file-input">
					Перетащите изображения сюда или нажмите для выбора
				</label>
			</div>
			</div>
			
			<div class="mt-4 d-flex justify-content-between align-items-center">
				<button class="btn btn-outline-secondary" @click="loadData" :disabled="loading">
					Обновить
				</button>
				<button class="btn btn-success" @click="onSave" :disabled="loading">
					Сохранить
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.product-image-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 1rem;
	margin-bottom: 2rem;
}

.product-image-card {
	position: relative;
	border: 2px solid #ddd;
	border-radius: 8px;
	padding: 0.5rem;
	background: white;
	transition: all 0.3s ease;
	cursor: grab;
}

.product-image-card:hover {
	border-color: #007bff;
	box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.product-image-card.is-main {
	border-color: #28a745;
	background: #f8fff9;
}

.product-image-card.dragging {
	opacity: 0.5;
	cursor: grabbing;
}

.product-image {
	width: 100%;
	height: 150px;
	object-fit: cover;
	border-radius: 4px;
	margin-bottom: 0.5rem;
}

.image-actions {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.image-actions .btn {
	font-size: 0.8rem;
}

.new-badge {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	background: #007bff;
	color: white;
	padding: 0.25rem 0.5rem;
	border-radius: 4px;
	font-size: 0.75rem;
	font-weight: bold;
}

.upload-area {
	border: 2px dashed #ddd;
	border-radius: 8px;
	padding: 2rem;
	text-align: center;
	background: #f8f9fa;
	transition: all 0.3s ease;
}

.upload-area:hover {
	border-color: #007bff;
	background: #f0f8ff;
}

.upload-area.dragover {
	border-color: #007bff;
	background: #e3f2fd;
}

.upload-area input[type="file"] {
	display: none;
}

.upload-area label {
	cursor: pointer;
	color: #007bff;
	font-weight: bold;
}

.upload-area label:hover {
	text-decoration: underline;
}
</style> 