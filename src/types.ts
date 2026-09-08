export interface ProductVariant {
  id: string
  name: string
  price: number
  currency: string
  available: boolean
}

export interface Product {
  id: string
  storeId: string
  name: string
  description: string
  imageUrl?: string
  productUrl?: string
  category?: string
  tags?: string[]
  price?: number
  currency?: string
  available?: boolean
  variants?: ProductVariant[]
}

export interface ResearchSource {
  title: string
  url: string
  snippet?: string
  publicationDate?: string
  sourceDomain?: string
}

export interface Message {
  role: 'user' | 'assistant'
  text: string
  products?: Product[]
  sources?: ResearchSource[]
  error?: boolean
}

export type RowanAvatarState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'processing'
  | 'speaking'
  | 'interrupted'
  | 'no_response'
  | 'answer'
  | 'error'

export interface ResearchSourceItem {
  title: string
  url: string
  snippet?: string
  image?: string
}

export interface RowanConnection {
  id: string
  userId: string
  type: 'website' | 'phone' | 'trading' | 'app' | 'general'
  name: string
  instructions: string
  permissions: string[]
  status: 'available' | 'connected' | 'requires_setup'
  updatedAt: number
}
