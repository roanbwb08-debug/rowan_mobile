/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  RefreshCw,
  Plus,
  Search,
  Trash2,
  Edit2,
  Database,
  Check,
  AlertCircle,
  ExternalLink,
  Sliders,
  X,
  PackageOpen,
  Info,
  ChevronRight
} from 'lucide-react'
import type { Product, ProductVariant } from '../types'

export const Catalog: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'integration'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Sync state
  const [catalogSource, setCatalogSource] = useState<string>('manual')
  const [syncStatus, setSyncStatus] = useState<string>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [feedUrl, setFeedUrl] = useState('')
  const [wooUrl, setWooUrl] = useState('https://mystore.com')
  const [wooKey, setWooKey] = useState('')
  const [apiEndpoint, setApiEndpoint] = useState('https://api.mystore.com/v1/products')
  const [jsonPayload, setJsonPayload] = useState('[\n  {\n    "name": "Organic Cotton Tee",\n    "price": 28,\n    "category": "Clothing"\n  }\n]')

  // Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Form State
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formProductUrl, setFormProductUrl] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formPrice, setFormPrice] = useState(0)
  const [formCurrency, setFormCurrency] = useState('USD')
  const [formAvailable, setFormAvailable] = useState(true)
  const [formInventory, setFormInventory] = useState(10)
  const [formTags, setFormTags] = useState('')
  const [formVariants, setFormVariants] = useState<ProductVariant[]>([])
  const [newVariantName, setNewVariantName] = useState('')
  const [newVariantPrice, setNewVariantPrice] = useState(0)

  // Success/Error notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // Load Products & Sync status
  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const res = await fetch('/api/catalog/products')
      const data = await res.json()
      if (data.success) {
        setProducts(data.products)
      } else {
        showNotification(data.message || 'Failed to load products', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotification('Server communication failure', 'error')
    } finally {
      setLoadingProducts(false)
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/catalog/sync')
      const data = await res.json()
      if (data.success) {
        setCatalogSource(data.catalogSource)
        setSyncStatus(data.catalogSyncStatus)
        setLastSyncedAt(data.catalogLastSyncedAt)
        setSyncError(data.catalogSyncError)
        if (data.feedUrl) setFeedUrl(data.feedUrl)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchSyncStatus()
  }, [])

  // Poll sync status if "syncing"
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (syncStatus === 'syncing') {
      timer = setInterval(async () => {
        await fetchSyncStatus()
        await fetchProducts()
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [syncStatus])

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) return
    try {
      const res = await fetch(`/api/catalog/products/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        showNotification('Product deleted successfully.')
        fetchProducts()
      } else {
        showNotification(data.message || 'Failed to delete product', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotification('Failed to communicate with server', 'error')
    }
  }

  // Edit or Add Product Save
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName || !formCategory) {
      showNotification('Please fill in all required fields.', 'error')
      return
    }

    const payload = {
      name: formName,
      description: formDescription,
      imageUrl: formImageUrl,
      productUrl: formProductUrl,
      category: formCategory,
      price: Number(formPrice),
      currency: formCurrency,
      available: formAvailable,
      inventory: Number(formInventory),
      tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
      variants: formVariants
    }

    try {
      const url = editingProduct 
        ? `/api/catalog/products/${editingProduct.id}`
        : '/api/catalog/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        showNotification(editingProduct ? 'Product updated successfully.' : 'Product created successfully.')
        setIsModalOpen(false)
        fetchProducts()
      } else {
        showNotification(data.message || 'Operation failed', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotification('Failed to contact database service', 'error')
    }
  }

  // Trigger sync
  const handleTriggerSync = async (source: string) => {
    try {
      const res = await fetch('/api/catalog/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          feedUrl: source === 'feed' ? feedUrl : undefined
        })
      })
      const data = await res.json()
      if (data.success) {
        setSyncStatus('syncing')
        showNotification('Synchronization pipeline initialized.')
      } else {
        showNotification(data.message || 'Sync start failed', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotification('Failed to request catalog synchronization', 'error')
    }
  }

  const openAddModal = () => {
    setEditingProduct(null)
    setFormName('')
    setFormDescription('')
    setFormImageUrl('')
    setFormProductUrl('')
    setFormCategory('')
    setFormPrice(0)
    setFormCurrency('USD')
    setFormAvailable(true)
    setFormInventory(10)
    setFormTags('')
    setFormVariants([])
    setIsModalOpen(true)
  }

  const openEditModal = (p: Product) => {
    setEditingProduct(p)
    setFormName(p.name || '')
    setFormDescription(p.description || '')
    setFormImageUrl(p.imageUrl || '')
    setFormProductUrl(p.productUrl || '')
    setFormCategory(p.category || '')
    setFormPrice(p.price || 0)
    setFormCurrency(p.currency || 'USD')
    setFormAvailable(p.available !== false)
    setFormInventory((p as any).inventory ?? 10)
    setFormTags(p.tags?.join(', ') || '')
    setFormVariants(p.variants || [])
    setIsModalOpen(true)
  }

  const addVariant = () => {
    if (!newVariantName) return
    const newVar: ProductVariant = {
      id: 'v_' + Math.random().toString(36).substr(2, 5),
      name: newVariantName,
      price: Number(newVariantPrice) || formPrice,
      currency: formCurrency,
      available: true
    }
    setFormVariants([...formVariants, newVar])
    setNewVariantName('')
    setNewVariantPrice(0)
  }

  const removeVariant = (vid: string) => {
    setFormVariants(formVariants.filter(v => v.id !== vid))
  }

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))] as string[]

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-8 relative text-zinc-800">
      {/* Dynamic Action Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 border ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-150 text-emerald-850'
                : 'bg-rose-50 border-rose-150 text-rose-850'
            }`}
          >
            {notification.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span className="text-xs font-bold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">
            PRODUCT SCHEMA
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 my-0">Catalog Manager</h1>
          <p className="text-sm text-zinc-500 mt-1 my-0">
            Build and synchronize Rowan's commerce catalog from any platform or manual upload.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-3 py-1.5 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-600">Tenant Scoped</span>
          </div>
        </div>
      </div>

      {/* Toggle Tab Panels */}
      <div className="flex border-b border-zinc-150">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-zinc-450 hover:text-zinc-800'
          }`}
        >
          Product Catalog & Inventory ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('integration')}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'integration'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-zinc-455 hover:text-zinc-800'
          }`}
        >
          Catalog Feed & Integration Sources
        </button>
      </div>

      {/* TAB 1: PRODUCT CATALOG & INVENTORY */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm">
              <span className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">Total Products</span>
              <p className="text-2xl font-bold mt-1 text-zinc-950 my-0">{products.length}</p>
              <p className="text-[10px] text-zinc-450 mt-1 my-0 font-medium">Directly accessible by Rowan</p>
            </div>
            <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm">
              <span className="text-[10px] font-extrabold text-zinc-455 uppercase tracking-wider block">Active Inventory</span>
              <p className="text-2xl font-bold mt-1 text-zinc-950 my-0">
                {products.reduce((acc, p) => acc + ((p as any).inventory ?? 0), 0)} Units
              </p>
              <p className="text-[10px] text-zinc-450 mt-1 my-0 font-medium">Stock tracking levels</p>
            </div>
            <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm">
              <span className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">Sync Mechanism</span>
              <p className="text-2xl font-bold text-blue-600 capitalize mt-1 my-0">{catalogSource}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'success' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                <span className="text-[10px] text-zinc-450 capitalize font-medium">{syncStatus}</span>
              </div>
            </div>
          </div>

          {/* Filtering & Actions bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search catalog products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-semibold"
                />
              </div>

              {/* Category selector */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3.5 py-2 bg-white border border-zinc-200 text-xs font-bold rounded-lg focus:outline-none text-zinc-700 capitalize cursor-pointer"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Manual add button */}
            <button
              onClick={openAddModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add Custom Product</span>
            </button>
          </div>

          {/* Main Products Grid or Empty panel */}
          {loadingProducts ? (
            <div className="py-24 text-center bg-white border border-zinc-200 rounded-2xl shadow-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-2">Loading authorized merchant catalog...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="border border-dashed border-zinc-200 rounded-2xl py-16 text-center bg-zinc-50/50">
              <PackageOpen className="w-10 h-10 text-zinc-300 mx-auto" />
              <h3 className="font-bold text-zinc-800 mt-4 text-base">No Catalog Products Found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 font-medium leading-relaxed">
                Your isolated store catalog database is unpopulated. Add a custom product manually or connect your external storefront feed!
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-6">
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Create Manually
                </button>
                <button
                  onClick={() => setActiveTab('integration')}
                  className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100/50 text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Configure Sync Connection
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-150 bg-zinc-50/50 text-[10px] font-bold text-zinc-450 uppercase tracking-wider">
                      <th className="p-4">Product Info</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Inventory Status</th>
                      <th className="p-4">Variants</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150">
                    {filteredProducts.map((p) => {
                      const stockCount = (p as any).inventory ?? 0
                      const isLowStock = stockCount < 5
                      const hasVariants = p.variants && p.variants.length > 0

                      return (
                        <tr key={p.id} className="text-xs hover:bg-zinc-50/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-zinc-50 overflow-hidden flex-shrink-0 flex items-center justify-center border border-zinc-200">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <PackageOpen className="w-4.5 h-4.5 text-zinc-400" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-zinc-900 my-0 text-xs">{p.name}</h4>
                                <p className="text-[11px] text-zinc-450 line-clamp-1 mt-0.5 my-0 font-medium">{p.description || 'No description provided.'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 text-[10px] font-bold text-zinc-600 capitalize">
                              {p.category || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-zinc-900">
                            {p.price ? `${p.price} ${p.currency || 'USD'}` : '—'}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                p.available !== false && stockCount > 0
                                  ? 'bg-emerald-500'
                                  : 'bg-rose-500'
                              }`} />
                              <div>
                                <span className="font-bold text-xs text-zinc-800">
                                  {p.available !== false && stockCount > 0 ? 'In Stock' : 'Out of Stock'}
                                </span>
                                <p className={`text-[10px] font-bold mt-0.5 my-0 ${isLowStock && stockCount > 0 ? 'text-amber-600' : 'text-zinc-400'}`}>
                                  {stockCount} units available
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            {hasVariants ? (
                              <div className="flex flex-wrap gap-1">
                                {p.variants!.map((v, i) => (
                                  <span key={v.id || i} className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 font-bold rounded border border-blue-100">
                                    {v.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-400 font-medium">No variants</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(p)}
                                className="p-2 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 rounded-lg transition-all cursor-pointer border-0 bg-transparent"
                                title="Edit Product"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-2 hover:bg-rose-50 text-rose-500 hover:text-rose-650 rounded-lg transition-all cursor-pointer border-0 bg-transparent"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CATALOG FEED & INTEGRATION SOURCES */}
      {activeTab === 'integration' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main config pane */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl space-y-6 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 my-0">Select Synchronization Provider</h3>
                <p className="text-xs text-zinc-500 mt-1 my-0">
                  Connect Rowan directly with WooCommerce, your REST API, or an automated catalog feed.
                </p>
              </div>

              {/* Source selection grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { id: 'manual', name: 'Manual / API', desc: 'CRUD operations' },
                  { id: 'woocommerce', name: 'WooCommerce', desc: 'Direct Store Sync' },
                  { id: 'api', name: 'REST API', desc: 'Secure custom endpoints' },
                  { id: 'feed', name: 'Product Feed', desc: 'XML/JSON/CSV URLs' },
                  { id: 'json', name: 'JSON Catalog', desc: 'Bulk Upload Raw JSON' }
                ].map((s) => {
                  const isSelected = catalogSource === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => setCatalogSource(s.id)}
                      className={`p-3 text-left border rounded-xl flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'border-blue-200 bg-blue-50/30'
                          : 'border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute right-2 top-2 bg-blue-600 rounded-full p-0.5 text-white">
                          <Check className="w-2 h-2" />
                        </div>
                      )}
                      <span className="font-bold text-xs text-zinc-800 block">{s.name}</span>
                      <span className="text-[9px] text-zinc-400 mt-1 leading-normal font-medium">{s.desc}</span>
                    </button>
                  )
                })}
              </div>

              {/* Dynamic settings forms based on active platform */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-4">
                {catalogSource === 'manual' && (
                  <div className="space-y-2">
                    <div className="flex gap-2 items-start text-zinc-500">
                      <Sliders className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      <div>
                        <p className="text-xs font-bold text-zinc-800 my-0">Manual Operations & REST API enabled</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 my-0 font-medium leading-relaxed">
                          You are using manual catalog control. Use the <strong>Product Catalog</strong> tab to manage, update, and edit inventory manually, or trigger sync via POST to <code>/api/catalog/products</code>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {catalogSource === 'woocommerce' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider mb-1.5">WooCommerce Store URL</label>
                        <input
                          type="url"
                          value={wooUrl}
                          onChange={(e) => setWooUrl(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider mb-1.5">Consumer Key / OAuth Token</label>
                        <input
                          type="password"
                          placeholder="ck_xxxxxxxxxxxxxxxxx"
                          value={wooKey}
                          onChange={(e) => setWooKey(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleTriggerSync('woocommerce')}
                      disabled={syncStatus === 'syncing'}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                    >
                      Connect & Execute Woo Sync
                    </button>
                  </div>
                )}

                {catalogSource === 'api' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider mb-1.5">E-Commerce Products API Endpoint</label>
                      <input
                        type="url"
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800"
                      />
                    </div>
                    <button
                      onClick={() => handleTriggerSync('api')}
                      disabled={syncStatus === 'syncing'}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                    >
                      Map endpoint & Sync
                    </button>
                  </div>
                )}

                {catalogSource === 'feed' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-zinc-455 uppercase tracking-wider mb-1.5">XML/RSS/CSV Product Feed URL</label>
                      <input
                        type="url"
                        placeholder="https://mystore.com/feeds/products.xml"
                        value={feedUrl}
                        onChange={(e) => setFeedUrl(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800"
                      />
                    </div>
                    <button
                      onClick={() => handleTriggerSync('feed')}
                      disabled={syncStatus === 'syncing'}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                    >
                      Fetch & Synchronize Feed
                    </button>
                  </div>
                )}

                {catalogSource === 'json' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider mb-1.5">Bulk Upload Raw Products JSON Array</label>
                      <textarea
                        rows={4}
                        value={jsonPayload}
                        onChange={(e) => setJsonPayload(e.target.value)}
                        className="w-full p-3 font-mono text-[11px] bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800"
                      />
                    </div>
                    <button
                      onClick={() => handleTriggerSync('json')}
                      disabled={syncStatus === 'syncing'}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                    >
                      Import & Validate JSON Catalog
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sync Status Info panel */}
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl space-y-6 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-950 my-0">Synchronization Monitor</h3>

              <div className="space-y-4">
                {/* Status card */}
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                  <span className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">Sync State</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      syncStatus === 'syncing'
                        ? 'bg-amber-500 animate-pulse'
                        : syncStatus === 'success'
                        ? 'bg-emerald-500'
                        : syncStatus === 'error'
                        ? 'bg-rose-500'
                        : 'bg-zinc-400'
                    }`} />
                    <span className="text-sm font-bold uppercase tracking-wide capitalize text-zinc-850">{syncStatus}</span>
                  </div>

                  <div className="text-[11px] text-zinc-500 mt-3 space-y-1 font-medium">
                    <div className="flex justify-between">
                      <span>Source Engine:</span>
                      <span className="font-bold capitalize">{catalogSource}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Synced At:</span>
                      <span className="font-bold">{lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Never'}</span>
                    </div>
                  </div>
                </div>

                {/* Info Tip */}
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex gap-3 text-xs text-blue-700">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <div className="space-y-1">
                    <p className="font-bold text-zinc-900 my-0">Real-time Recommendation update</p>
                    <p className="leading-relaxed text-[11px] text-zinc-500 my-0 font-medium">
                      When catalog synchronization completes, Rowan's internal catalog updates dynamically with zero downtime. Customers conversing via Twilio SMS or the widget will receive recommendations from this synchronized product catalog instantly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED CRUD MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-zinc-950/20 backdrop-blur-xs"
            />

            {/* Modal Canvas */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-white">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 my-0">
                    {editingProduct ? `Edit ${editingProduct.name}` : 'Add New Custom Product'}
                  </h3>
                  <p className="text-[10px] text-zinc-450 uppercase font-bold mt-0.5 my-0">Isolated tenant-specific record</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-zinc-50 text-zinc-400 hover:text-zinc-700 transition-all cursor-pointer border-0 bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content Scroll panel */}
              <form onSubmit={handleSaveProduct} className="flex-grow overflow-y-auto p-6 space-y-5 bg-white">
                {/* 1. Core info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <label className="block text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider mb-1">Product Title *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-bold"
                      placeholder="e.g. Explorer Hydration Pack"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <label className="block text-[10px] font-extrabold text-zinc-455 uppercase tracking-wider mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800"
                      placeholder="Product specifications, features, material details..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider mb-1">Category *</label>
                    <input
                      type="text"
                      required
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-bold"
                      placeholder="e.g. Shoes, Clothing, Food"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800"
                      placeholder="outdoor, active, waterproof"
                    />
                  </div>
                </div>

                {/* 2. Pricing & stock */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-zinc-150 pt-5">
                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <label className="block text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider mb-1">Price *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-zinc-455 uppercase tracking-wider mb-1">Currency</label>
                    <input
                      type="text"
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider mb-1">Stock Count</label>
                    <input
                      type="number"
                      min="0"
                      value={formInventory}
                      onChange={(e) => setFormInventory(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-850 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-zinc-455 uppercase tracking-wider mb-1">Availability</label>
                    <select
                      value={formAvailable ? 'true' : 'false'}
                      onChange={(e) => setFormAvailable(e.target.value === 'true')}
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none text-zinc-700 font-bold cursor-pointer"
                    >
                      <option value="true">In Stock</option>
                      <option value="false">Out of Stock</option>
                    </select>
                  </div>
                </div>

                {/* 3. Media & Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-150 pt-5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider mb-1">Image URL</label>
                    <input
                      type="url"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800"
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider mb-1">Product Page Link</label>
                    <input
                      type="text"
                      value={formProductUrl}
                      onChange={(e) => setFormProductUrl(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800"
                      placeholder="/products/explorer-pack"
                    />
                  </div>
                </div>

                {/* 4. Product Variants */}
                <div className="border-t border-zinc-150 pt-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider my-0">Product Variants (e.g. Sizes, Colors)</h4>
                    <p className="text-[10px] text-zinc-450 leading-normal mt-0.5 my-0 font-medium">
                      Configure multiple options for this product with distinct prices and availability.
                    </p>
                  </div>

                  {/* List of currently created variants */}
                  {formVariants.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                      {formVariants.map((v) => (
                        <div key={v.id} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-zinc-200 rounded text-xs font-bold text-zinc-700 shadow-sm">
                          <span>{v.name} ({v.price} {v.currency})</span>
                          <button
                            type="button"
                            onClick={() => removeVariant(v.id)}
                            className="text-zinc-400 hover:text-rose-500 transition-all ml-1 cursor-pointer border-0 bg-transparent"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add variant inline panel */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Variant Name (e.g. Small / Red)"
                      value={newVariantName}
                      onChange={(e) => setNewVariantName(e.target.value)}
                      className="flex-grow px-3.5 py-1.5 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-medium"
                    />
                    <input
                      type="number"
                      placeholder="Variant Price"
                      value={newVariantPrice || ''}
                      onChange={(e) => setNewVariantPrice(Number(e.target.value))}
                      className="w-full sm:w-36 px-3.5 py-1.5 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-medium"
                    />
                    <button
                      type="button"
                      onClick={addVariant}
                      className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition-all cursor-pointer border border-zinc-200"
                    >
                      Add Option
                    </button>
                  </div>
                </div>
              </form>

              {/* Modal footer controls */}
              <div className="px-6 py-4 border-t border-zinc-150 bg-zinc-50 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-transparent text-zinc-500 hover:text-zinc-800 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
