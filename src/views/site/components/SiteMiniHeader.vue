<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

function isActive(path) {
	return route.path === path
}
</script>

<template>
	<div class="">
		<ul class="nav nav-pills d-flex justify-content-center">
			<li class="nav-item">
				<router-link to="/site/banner" class="nav-link" :class="{ active: isActive('/site/banner') }" aria-current="page">Баннер</router-link>
			</li>
			<li class="nav-item">
				<router-link to="/site/documents" class="nav-link" :class="{ active: isActive('/site/documents') }" aria-current="page">Документы</router-link>
			</li>
			<li class="nav-item">
				<router-link to="/site/categories" class="nav-link" :class="{ active: isActive('/site/categories') }" aria-current="page">Категории</router-link>
			</li>
			<li class="nav-item">
				<router-link to="/site/discounts" class="nav-link" :class="{ active: isActive('/site/discounts') }" aria-current="page">Скидки</router-link>
			</li>
			<li class="nav-item">
				<router-link to="/site/outlets" class="nav-link" :class="{ active: isActive('/site/outlets') }" aria-current="page">Outlet</router-link>
			</li>
		</ul>
	</div>
</template>

<style scoped>
</style> 