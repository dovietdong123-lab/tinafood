'use client'

import { useState } from 'react'
import ShopHeader from '@/components/ShopHeader'
import Tabs from '@/components/Tabs'
import HomeTab from '@/components/tabs/HomeTab'
import ProductsTab from '@/components/tabs/ProductsTab'
import CategoriesTab from '@/components/tabs/CategoriesTab'
import ProductDetailModal from '@/components/ProductDetailModal'
import CartSidebar from '@/components/CartSidebar'
import PopupCart from '@/components/PopupCart'
import { ProductDetailProvider } from '@/hooks/useProductDetail'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'products' | 'categories'>('home')
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; name: string } | null>(null)

  const handleCategorySelect = (category: { term_id: number; name: string }) => {
    setSelectedCategory({ id: category.term_id, name: category.name })
    setActiveTab('products')
  }

  const handleClearCategory = () => {
    setSelectedCategory(null)
  }

  return (
    <ProductDetailProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-50 bg-white border-b">
          <ShopHeader />
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
        
        <main className="pb-20">
          {activeTab === 'home' && <HomeTab isActive={true} />}
          {activeTab === 'products' && (
            <ProductsTab
              isActive={true}
              selectedCategoryId={selectedCategory?.id}
              selectedCategoryName={selectedCategory?.name}
              onClearCategory={handleClearCategory}
            />
          )}
          {activeTab === 'categories' && (
            <CategoriesTab
              isActive={true}
              onCategorySelect={handleCategorySelect}
              activeCategoryId={selectedCategory?.id || null}
            />
          )}
        </main>

        <ProductDetailModal />
        <CartSidebar />
        <PopupCart />
      </div>
    </ProductDetailProvider>
  )
}

