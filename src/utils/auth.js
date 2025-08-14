import { apiFetch } from './http'

export async function loginWithEmailPassword(email, password) {
	const body = new URLSearchParams({
		grant_type: 'password',
		username: email,
		password
	});
	const res = await apiFetch('/auth/jwt/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
		formUrlEncoded: true
	});
	const data = await res.json().catch(() => ({}));
	if (res.ok && data?.access_token) {
		document.cookie = `Bearer=${data.access_token}; path=/;`;
		return { ok: true, data };
	}
	return { ok: false, error: data?.detail || 'Login failed' };
}

export function logout() {
	document.cookie = 'Bearer=; Max-Age=0; path=/;';
	localStorage.removeItem('session_id');
}

export async function fetchMe() {
	const res = await apiFetch('/user/me');
	if (!res.ok) return null;
	return res.json();
}

export async function validateAdmin() {
	const res = await apiFetch('/auth/admin-token');
	return res.ok;
} 