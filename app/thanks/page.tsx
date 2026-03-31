'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ShopHeader from '@/components/ShopHeader'

function ThanksContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col h-[100dvh] max-w-[500px] mx-auto overflow-hidden">
      <div className="bg-white border-b shrink-0">
        <ShopHeader />
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-32 flex items-center justify-center relative">
          <div className="absolute -bottom-10 bg-white rounded-full p-4 shadow-lg border-4 border-white">
            <svg
              className="w-12 h-12 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="pt-16 pb-10 px-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cảm ơn bạn!</h1>
          <p className="text-gray-600 text-lg mb-6 leading-relaxed">
            Chúng tôi sẽ sớm giao hàng đến bạn. <br className="hidden sm:block" /> Vui lòng để ý điện thoại giúp shop nhé!
          </p>

          <div className="bg-emerald-50 rounded-xl p-4 mb-8 border border-emerald-100">
            <p className="text-emerald-800 font-medium text-sm mb-1 uppercase tracking-wider">
              Mã đơn hàng
            </p>
            <p className="text-2xl font-mono font-bold text-emerald-900">
              #{orderId || '------'}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-500 italic">
              TinaFood - Ăn ngon mỗi ngày
            </p>
            <div className="h-px bg-gray-100 w-full my-6"></div>
            <Link
              href="/"
              className="block w-full bg-black text-white font-bold py-4 rounded-xl shadow-lg hover:bg-gray-800 transition-colors transform active:scale-95"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 py-4 px-8 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs text-gray-400">© 2026 TinaFood</span>
          <div className="flex gap-3">
            <span className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Hỗ trợ</span>
            <span className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Chính sách</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

export default function ThanksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Đang tải...</div>}>
      <ThanksContent />
    </Suspense>
  )
}
