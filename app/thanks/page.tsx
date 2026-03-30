'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

/**
 * Component hiển thị nội dung trang cảm ơn.
 * Được bao bọc trong Suspense vì dùng useSearchParams.
 */
function ThanksContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Container chính: Đảm bảo max-width cố định và giao diện ổn định */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header với Gradient mượt mà */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 h-32 flex items-center justify-center relative">
          <div className="absolute -bottom-10 bg-white rounded-full p-4 shadow-md border-4 border-white">
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

        {/* Nội dung chi tiết */}
        <div className="pt-16 pb-10 px-8 text-center bg-white">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cảm ơn bạn!</h1>
          <p className="text-gray-600 text-base mb-6 leading-relaxed">
            Đơn hàng của bạn đã được hệ thống tiếp nhận và đang chờ xử lý.
          </p>

          {/* Box hiển thị Mã đơn hàng - Cố định kích thước để tránh nhảy layout */}
          <div className="bg-emerald-50 rounded-xl p-5 mb-8 border border-emerald-100 min-h-[90px] flex flex-col justify-center items-center">
            <p className="text-emerald-800 font-semibold text-xs mb-1 uppercase tracking-widest opacity-80">
              Mã đơn hàng của bạn
            </p>
            <p className="text-2xl font-mono font-bold text-emerald-900 select-all">
              #{orderId || '------'}
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-500 italic">
              Chúng tôi sẽ liên hệ sớm nhất qua số điện thoại bạn cung cấp.
            </p>
            <div className="h-px bg-gray-100 w-full my-4"></div>
            <Link
              href="/"
              className="block w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md hover:bg-black transition-all transform active:scale-95 text-center no-underline"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-gray-50/50 py-4 px-8 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-medium">
          <span>TINAFOOD © 2026</span>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-emerald-600 transition-colors">HỖ TRỢ</Link>
            <Link href="/" className="hover:text-emerald-600 transition-colors">ĐIỀU KHOẢN</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Trang /thanks chính thức của ứng dụng.
 */
export default function ThanksPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full animate-pulse bg-white rounded-2xl h-[450px]"></div>
        </div>
      }
    >
      <ThanksContent />
    </Suspense>
  )
}
