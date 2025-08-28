import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../views/LoginPage.vue'
import HomePage from '../views/HomePage.vue'
import ForbiddenPage from '../views/ForbiddenPage.vue'
import LeadsPage from '../views/leads/LeadsPage.vue'
import LeadDetailPage from '../views/leads/LeadDetailPage.vue'
import OrdersPage from '../views/orders/OrdersPage.vue'
import OrderDetailPage from '../views/orders/OrderDetailPage.vue'
import OrderUpdatePage from '../views/orders/OrderUpdatePage.vue'
import ProductsPage from '../views/products/ProductsPage.vue'
import ProductDetailPage from '../views/products/ProductDetailPage.vue'
import ProductUpdateImagePage from '../views/products/ProductUpdateImagePage.vue'
import ClientsPage from '../views/ClientsPage.vue'
import ReportPage from '../views/ReportPage.vue'
import SitePage from '../views/SitePage.vue'
import BannerPage from '../views/site/BannerPage.vue'
import BannerEditPage from '../views/site/BannerEditPage.vue'
import DocumentsPage from '../views/site/DocumentsPage.vue'
import CategoriesPage from '../views/site/CategoriesPage.vue'
import DiscountsPage from '../views/site/DiscountsPage.vue'
import OutletsPage from '../views/site/OutletsPage.vue'
import DocumentAddPage from '../views/site/DocumentAddPage.vue'
import DocumentUpdatePage from '../views/site/DocumentUpdatePage.vue'
import CategoryProductsPage from '../views/site/CategoryProductsPage.vue'
import { validateAdmin } from '../utils/auth'

const routes = [
	{ path: '/login', name: 'login', component: LoginPage, meta: { public: true } },
	{ path: '/403', name: 'forbidden', component: ForbiddenPage, meta: { public: true } },
	{ path: '/', name: 'home', component: HomePage, meta: { requiresAuth: true } },
	{ path: '/leads', name: 'leads', component: LeadsPage, meta: { requiresAuth: true } },
	{ path: '/leads/:id', name: 'lead-detail', component: LeadDetailPage, meta: { requiresAuth: true } },
	{ path: '/orders', name: 'orders', component: OrdersPage, meta: { requiresAuth: true } },
	{ path: '/orders/:id', name: 'order-detail', component: OrderDetailPage, meta: { requiresAuth: true } },
	{ path: '/orders/:id/update', name: 'order-update', component: OrderUpdatePage, meta: { requiresAuth: true } },
	{ path: '/products', name: 'products', component: ProductsPage, meta: { requiresAuth: true } },
	{ path: '/products/:id', name: 'product-detail', component: ProductDetailPage, meta: { requiresAuth: true } },
	{ path: '/products/:id/image', name: 'product-update-image', component: ProductUpdateImagePage, meta: { requiresAuth: true } },
	{ path: '/clients', name: 'clients', component: ClientsPage, meta: { requiresAuth: true } },
	{ path: '/report', name: 'report', component: ReportPage, meta: { requiresAuth: true } },
	{
		path: '/site',
		component: SitePage,
		meta: { requiresAuth: true },
		children: [
			{ path: '', redirect: '/site/banner' },
			{ path: 'banner', name: 'site-banner', component: BannerPage, meta: { requiresAuth: true } },
			{ path: 'banner/edit', name: 'site-banner-edit', component: BannerEditPage, meta: { requiresAuth: true } },
			{ path: 'documents', name: 'site-documents', component: DocumentsPage, meta: { requiresAuth: true } },
			{ path: 'documents/add', name: 'site-documents-add', component: DocumentAddPage, meta: { requiresAuth: true } },
			{ path: 'documents/update/:id', name: 'site-documents-update', component: DocumentUpdatePage, meta: { requiresAuth: true } },
			{ path: 'categories', name: 'site-categories', component: CategoriesPage, meta: { requiresAuth: true } },
			{ path: 'categories/:id/products', name: 'site-categories-products', component: CategoryProductsPage, meta: { requiresAuth: true } },
			{ path: 'discounts', name: 'site-discounts', component: DiscountsPage, meta: { requiresAuth: true } },
			{ path: 'outlets', name: 'site-outlets', component: OutletsPage, meta: { requiresAuth: true } },
		]
	}
]

const router = createRouter({
	history: createWebHistory(),
	routes
})

let isChecking = false

router.beforeEach(async (to) => {
	if (to.meta?.public) return true
	if (!to.meta?.requiresAuth) return true
	if (isChecking) return false
	isChecking = true
	try {
		const ok = await validateAdmin()
		if (!ok) {
			return { name: 'forbidden' }
		}
		return true
	} finally {
		isChecking = false
	}
})

export default router 