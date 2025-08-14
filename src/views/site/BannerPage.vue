<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCookie } from '../../utils/http'

const router = useRouter()
const carouselImages = ref([])
const loading = ref(true)
const error = ref('')

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
		const siteUrl = window.AppConfig?.siteUrl || ''
		const res = await fetchWithAuth(`${siteUrl}/carousel/`)
		if (!res.ok) throw new Error('Ошибка загрузки карусели')
		return await res.json()
	} catch (e) {
		throw e
	}
}

async function loadData() {
	try {
		loading.value = true
		error.value = ''
		const data = await fetchCarouselImages()
		carouselImages.value = data
	} catch (e) {
		error.value = 'Ошибка загрузки баннера'
		carouselImages.value = []
	} finally {
		loading.value = false
	}
}

function goToEdit() {
	router.push('/site/banner/edit')
}

onMounted(() => {
	loadData()
})
</script>

<template>
	<div class="container mt-4">
		<h1>Баннер</h1>
		
		<div v-if="loading" class="text-center text-muted py-4">
			Загрузка...
		</div>
		
		<div v-else-if="error" class="alert alert-danger">
			{{ error }}
		</div>
		
		<div v-else>
			<div class="container">
				<div id="carouselExample" class="carousel slide" data-bs-ride="carousel">
					<div class="carousel-inner rounded" id="carouselInner">
						<div v-for="(item, index) in carouselImages" 
							 :key="item.id || index"
							 :class="['carousel-item', { 'active': index === 0 }]">
							<img :src="item.src" 
								 :alt="`Slide ${index + 1}`"
								 class="d-block w-100"
								 style="height: 400px; object-fit: cover;">
						</div>
					</div>
					
					<button v-if="carouselImages.length > 1" 
							class="carousel-control-prev" 
							type="button" 
							data-bs-target="#carouselExample" 
							data-bs-slide="prev">
						<span class="carousel-control-prev-icon" aria-hidden="true"></span>
						<span class="visually-hidden">Previous</span>
					</button>
					
					<button v-if="carouselImages.length > 1" 
							class="carousel-control-next" 
							type="button" 
							data-bs-target="#carouselExample" 
							data-bs-slide="next">
						<span class="carousel-control-next-icon" aria-hidden="true"></span>
						<span class="visually-hidden">Next</span>
					</button>
				</div>
			</div>
			
			<button @click="goToEdit" class="btn btn-warning mt-3 w-100">
				Изменить
			</button>
		</div>
	</div>
</template>

<style scoped>
.carousel-item img {
	height: 400px;
	object-fit: cover;
}

.carousel-control-prev,
.carousel-control-next {
	background: rgba(0, 0, 0, 0.3);
	border-radius: 50%;
	width: 50px;
	height: 50px;
	margin: auto 20px;
}

.carousel-control-prev-icon,
.carousel-control-next-icon {
	width: 25px;
	height: 25px;
}
</style> 