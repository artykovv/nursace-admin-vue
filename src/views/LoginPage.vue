<script setup>
import { ref } from 'vue'
import { loginWithEmailPassword, fetchMe } from '../utils/auth'

const email = ref('')
const password = ref('')
const remember = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

async function onSubmit(e) {
	e.preventDefault()
	error.value = ''
	success.value = ''
	loading.value = true
	try {
		const { ok, error: err } = await loginWithEmailPassword(email.value, password.value)
		if (!ok) {
			error.value = err || 'Неверный логин или пароль'
			return
		}
		try {
			const me = await fetchMe()
			if (me?.session_id) {
				localStorage.setItem('session_id', me.session_id)
			}
		} catch {}
		success.value = 'Успешный вход! Перенаправляем...'
		setTimeout(() => {
			const url = new URL(window.location.href)
			const redirect = url.searchParams.get('redirect') || '/'
			window.location.href = redirect
		}, 1000)
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="d-flex justify-content-center align-items-center min-vh-100">
		<div class="container p-4 col-md-4">
			<div class="text-center">
				<div class="mt-3">
					<div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
					<div v-if="success" class="alert alert-success" role="alert">{{ success }}</div>
				</div>

				<form @submit="onSubmit">
					<img class="mb-4" src="https://static.ticimax.cloud/5448/uploads/editorUploads/nurasce-web-logo-02.png" alt="Логотип" height="100" />
					<h1 class="h3 mb-3 fw-normal">Пожалуйста, войдите</h1>

					<div class="form-floating mb-3 text-start">
						<input type="email" class="form-control" id="floatingInput" placeholder="name@example.com" v-model="email" />
						<label for="floatingInput">Адрес электронной почты</label>
					</div>

					<div class="form-floating mb-3 text-start">
						<input type="password" class="form-control" id="floatingPassword" placeholder="Пароль" v-model="password" />
						<label for="floatingPassword">Пароль</label>
					</div>

					<div class="form-check text-start mb-3">
						<input class="form-check-input" type="checkbox" value="remember-me" id="checkDefault" v-model="remember" />
						<label class="form-check-label" for="checkDefault">Запомнить меня</label>
					</div>

					<button class="btn btn-primary w-100 py-2" type="submit" :disabled="loading">
						<span v-if="!loading">Войти</span>
						<span v-else>Входим...</span>
					</button>
				</form>
			</div>
		</div>
	</div>
</template>

<style scoped>
</style> 