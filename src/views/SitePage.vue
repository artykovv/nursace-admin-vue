<script setup>
import SiteMiniHeader from './site/components/SiteMiniHeader.vue'
</script>

<template>
	<div class="container">
		<SiteMiniHeader />
		<div class="mt-4">
			<router-view />
		</div>
	</div>
</template>

<style scoped>
</style> 