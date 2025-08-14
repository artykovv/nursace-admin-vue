<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

function isActive(prefix) {
	return route.path === prefix || route.path.startsWith(prefix + '/')
}
</script>

<template>
	<header id="main-header" style="background-color: white;">
		<div class="container">
			<div class="header d-flex align-items-center justify-content-between py-3">
				<div class="logo">
					<router-link to="/">
						<img src="https://static.ticimax.cloud/5448/uploads/editorUploads/nurasce-web-logo-02.png" alt="Logo" class="img-fluid" style="max-height: 60px;" />
					</router-link>
				</div>
				<div class="d-flex">
					<ul class="nav nav-pills">
						<li class="nav-item">
							<router-link to="/" class="nav-link" :class="{ active: isActive('/') }">Главная</router-link>
						</li>
						<li class="nav-item">
							<router-link to="/leads" class="nav-link" :class="{ active: isActive('/leads') }">Лиды</router-link>
						</li>
						<li class="nav-item">
							<router-link to="/orders" class="nav-link" :class="{ active: isActive('/orders') }">Заказы</router-link>
						</li>
						<li class="nav-item">
							<router-link to="/products" class="nav-link" :class="{ active: isActive('/products') }">Товары</router-link>
						</li>
						<li class="nav-item">
							<router-link to="/clients" class="nav-link" :class="{ active: isActive('/clients') }">Клиенты</router-link>
						</li>
						<li class="nav-item">
							<router-link to="/report" class="nav-link" :class="{ active: isActive('/report') }">Отчет</router-link>
						</li>
						<li class="nav-item">
							<router-link to="/site" class="nav-link" :class="{ active: isActive('/site') }">Сайт</router-link>
						</li>
					</ul>
				</div>
				<div></div>
			</div>
		</div>
	</header>
</template>

<style scoped>
</style> 