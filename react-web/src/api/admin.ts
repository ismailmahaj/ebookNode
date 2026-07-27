import { api } from './client'

export interface AdminCategory {
  id: number
  name: string
  slug: string
  description?: string
  image_url?: string
  ebook_count?: number
}

export interface AdminEbook {
  id: number
  title: string
  slug: string
  author: string
  description: string
  isbn?: string
  cover_image_url: string
  pdf_file_path: string
  pdf_file_size: number
  total_pages: number
  preview_pages: number
  published_at: string | null
  is_featured: boolean
  is_active: boolean
  categories?: AdminCategory[]
  total_views?: number
}

export interface AdminEbooksResponse {
  data: AdminEbook[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface AdminUser {
  id: number
  name: string
  email: string
  subscription_status: string | null
  subscription_ends_at: string | null
  trial_ends_at: string | null
  has_active_subscription: boolean
  is_on_trial: boolean
  is_admin: boolean
  created_at: string
}

export interface AdminUsersResponse {
  data: AdminUser[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export async function getAdminUsers(params?: {
  page?: number
  per_page?: number
  search?: string
  subscription_status?: 'active' | 'inactive'
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}): Promise<AdminUsersResponse> {
  const { data } = await api.get<AdminUsersResponse>('/admin/users', { params })
  return data
}

export async function updateUserSubscription(
  userId: number,
  data: { subscription_status: 'active' | 'inactive' | 'canceled'; subscription_ends_at?: string }
): Promise<{ message: string; user: AdminUser }> {
  const res = await api.patch<{ message: string; user: AdminUser }>(
    `/admin/users/${userId}/subscription`,
    data
  )
  return res.data
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const { data } = await api.get<AdminCategory[]>('/admin/categories')
  return data
}

export async function createAdminCategory(payload: {
  name: string
  description?: string
}): Promise<{ category: AdminCategory }> {
  const { data } = await api.post<{ category: AdminCategory }>('/admin/categories', payload)
  return data
}

export async function updateAdminCategory(
  id: number,
  payload: { name: string; description?: string }
): Promise<{ category: AdminCategory }> {
  const { data } = await api.patch<{ category: AdminCategory }>(`/admin/categories/${id}`, payload)
  return data
}

export async function deleteAdminCategory(id: number): Promise<void> {
  await api.delete(`/admin/categories/${id}`)
}

export async function getAdminEbooks(params?: {
  page?: number
  per_page?: number
  search?: string
  category_id?: number
  is_active?: boolean
  is_featured?: boolean
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}): Promise<AdminEbooksResponse> {
  const { data } = await api.get<AdminEbooksResponse>('/admin/ebooks', { params })
  return data
}

export async function getAdminEbook(id: number): Promise<{ ebook: AdminEbook }> {
  const { data } = await api.get<{ ebook: AdminEbook }>(`/admin/ebooks/${id}`)
  return data
}

function formDataHeaders(): Record<string, string | false> {
  const h: Record<string, string | false> = {
    Accept: 'application/json',
    'Content-Type': false, // laisse le navigateur envoyer multipart/form-data avec boundary
  }
  const token = localStorage.getItem('token')
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

export async function createAdminEbook(formData: FormData): Promise<{ ebook: AdminEbook }> {
  const { data } = await api.post<{ ebook: AdminEbook }>('/admin/ebooks', formData, {
    headers: formDataHeaders(),
  })
  return data
}

export async function updateAdminEbook(id: number, formData: FormData): Promise<{ ebook: AdminEbook }> {
  formData.append('_method', 'PUT')
  const { data } = await api.post<{ ebook: AdminEbook }>(`/admin/ebooks/${id}`, formData, {
    headers: formDataHeaders(),
  })
  return data
}

export async function deleteAdminEbook(id: number): Promise<void> {
  await api.delete(`/admin/ebooks/${id}`)
}

export async function toggleEbookVisibility(id: number): Promise<{ message: string; ebook: AdminEbook }> {
  const { data } = await api.post<{ message: string; ebook: AdminEbook }>(`/admin/ebooks/${id}/toggle-visibility`)
  return data
}
