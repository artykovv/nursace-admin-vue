export function getCookie(name) {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
	return null;
}

export async function apiFetch(path, { method = 'GET', headers = {}, body, formUrlEncoded = false } = {}) {
	const baseUrl = window.AppConfig?.siteUrl || '';
	const token = getCookie('Bearer');
	const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
	const finalHeaders = { 'Accept': 'application/json', ...authHeaders, ...headers };
	let finalBody = body;
	if (body && !formUrlEncoded && !(body instanceof FormData)) {
		finalHeaders['Content-Type'] = 'application/json';
		finalBody = JSON.stringify(body);
	}
	const res = await fetch(`${baseUrl}${path}`, {
		method,
		headers: finalHeaders,
		body: finalBody,
		credentials: 'include'
	});
	return res;
} 