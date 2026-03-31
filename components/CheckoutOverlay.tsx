'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import MediaDisplay from '@/components/MediaDisplay'

interface CartItem {
  productId: number
  productName: string
  variant?: {
    label?: string
    value?: string
  }
  quantity: number
  price: number
  regularPrice?: number
  discount?: number
  image: string
  attributes?: Record<string, string>
}

interface CheckoutOverlayProps {
  isOpen: boolean
  onClose: () => void
  directProduct?: CartItem | null // Sản phẩm mua trực tiếp (không thêm vào giỏ hàng)
}

const capitalizeWords = (text?: string) => {
  if (!text) return ''
  return text
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function CheckoutOverlay({ isOpen, onClose, directProduct }: CheckoutOverlayProps) {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [isAnimating, setIsAnimating] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  const [storeName, setStoreName] = useState('TikTiok Shop')
  const [orderCountdown, setOrderCountdown] = useState(27099)

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  // Validation errors
  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    address: '',
  })

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    coupon: {
      code: string
      discount_type: 'percent' | 'fixed'
      discount_value: number
    }
    discountAmount: number
    finalAmount: number
  } | null>(null)
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([])

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/settings')
        const data = await response.json()
        if (response.ok && data.success && data.data?.storeName) {
          setStoreName(data.data.storeName)
        }
      } catch (error) {
        console.warn('Failed to load store settings', error)
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Kiểm tra xem có phải là quay lại từ back button không
      const isBackNavigation = sessionStorage.getItem('checkout_overlay_back') === 'true'

      setIsClosing(false)
      // Reset form
      setCustomerName('')
      setCustomerPhone('')
      setCustomerAddress('')
      setErrors({ name: '', phone: '', address: '' })
      setCouponInput('')
      setAppliedCoupon(null)
      setCouponMessage(null)

      // Fetch available coupons
      const loadCoupons = async () => {
        try {
          const res = await fetch('/api/coupons')
          const data = await res.json()
          if (data.success && Array.isArray(data.data)) {
            setAvailableCoupons(data.data)
          }
        } catch (error) {
          console.error('Failed to load coupons:', error)
        }
      }
      loadCoupons()

      // Nếu có directProduct, sử dụng nó thay vì load từ cart
      if (directProduct) {
        setCart([
          {
            ...directProduct,
            quantity: directProduct.quantity && directProduct.quantity > 0 ? directProduct.quantity : 1,
          },
        ])
      } else {
        // Load cart from API
        const loadCart = async () => {
          try {
            const response = await fetch('/api/cart')
            const data = await response.json()
            if (data.success && Array.isArray(data.data)) {
              setCart(
                data.data.map((item: CartItem) => ({
                  ...item,
                  quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
                }))
              )
            } else {
              setCart([])
            }
          } catch (error) {
            console.error('Failed to load cart:', error)
            setCart([])
          }
        }
        loadCart()
      }

      if (isBackNavigation) {
        // Nếu là back navigation, không animate
        sessionStorage.removeItem('checkout_overlay_back')
        setIsAnimating(false)
      } else {
        // Nếu là lần đầu mở, có animation
        setIsAnimating(true)
        const timer = setTimeout(() => {
          setIsAnimating(false)
        }, 50)
        return () => clearTimeout(timer)
      }
    } else {
      setIsAnimating(true)
      setIsClosing(false)
    }
  }, [isOpen, directProduct])

  const handleClose = () => {
    // Đánh dấu là back navigation để trang cũ không animate
    sessionStorage.setItem('checkout_overlay_back', 'true')
    setIsClosing(true)
    setIsAnimating(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const formatPrice = (price: number) => Number(price || 0).toLocaleString('vi-VN') + 'đ'
  const formatCountdown = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    const pad = (num: number) => String(num).padStart(2, '0')
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
  }

  useEffect(() => {
    if (!isOpen) return
    setOrderCountdown(27099)
    const interval = setInterval(() => {
      setOrderCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [isOpen])

  const cartSummary = useMemo(() => {
    return cart.reduce(
      (acc, item) => {
        const qty = item.quantity || 0
        acc.subtotal += (Number(item.price) || 0) * qty
        acc.count += qty
        return acc
      },
      { subtotal: 0, count: 0 }
    )
  }, [cart])

  const subtotal = cartSummary.subtotal
  const discountAmount = appliedCoupon?.discountAmount || 0
  const finalTotal = Math.max(0, subtotal - discountAmount)

  const updateQuantity = async (index: number, delta: number) => {
    const item = cart[index]
    if (!item) return

    const currentQty = item.quantity && item.quantity > 0 ? item.quantity : 1
    const newQty = Math.max(1, currentQty + delta)

    // Lưu giá trị cũ để rollback nếu cần
    const oldCart = [...cart]

    // Cập nhật local state trước (optimistic update)
    setCart((prev) => {
      const next = [...prev]
      // Find item by productId + variant instead of index for safety
      const itemIndex = next.findIndex(
        (i) =>
          i.productId === item.productId &&
          JSON.stringify(i.variant) === JSON.stringify(item.variant)
      )
      if (itemIndex >= 0) {
        next[itemIndex] = { ...next[itemIndex], quantity: newQty }
      }
      return next
    })

    // Nếu là directProduct, chỉ cập nhật local state, không gọi API
    if (directProduct) {
      return
    }

    // Lưu vào API chỉ khi không phải directProduct
    try {
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: item.productId,
          variant: item.variant,
          quantity: newQty,
        }),
      })

      // Reload cart từ server để đảm bảo sync
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          setCart(
            data.data.map((item: CartItem) => ({
              ...item,
              quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
            }))
          )
          // Dispatch event để cập nhật cart count
          window.dispatchEvent(new Event('cartUpdated'))
        }
      } else {
        // Rollback nếu lỗi
        setCart(oldCart)
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
      // Rollback nếu lỗi
      setCart(oldCart)
    }
  }

  const validateForm = (): boolean => {
    const newErrors = { name: '', phone: '', address: '' }
    let isValid = true

    // Validate name
    const nameTrimmed = customerName.trim()
    if (nameTrimmed.length < 2) {
      newErrors.name = 'Vui lòng nhập tên (tối thiểu 2 ký tự).'
      isValid = false
    }

    // Validate phone - must be exactly 10 digits
    const phoneDigits = customerPhone.replace(/\D/g, '')
    if (phoneDigits.length !== 10) {
      newErrors.phone = 'Số điện thoại phải có đúng 10 số.'
      isValid = false
    } else if (!phoneDigits.startsWith('0')) {
      newErrors.phone = 'Số điện thoại phải bắt đầu bằng số 0.'
      isValid = false
    }

    // Validate address
    const addressTrimmed = customerAddress.trim()
    if (addressTrimmed.length < 5) {
      newErrors.address = 'Vui lòng nhập địa chỉ (tối thiểu 5 ký tự).'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    if (cart.length === 0) {
      alert('Giỏ hàng trống!')
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare order data
      const orderData = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.replace(/\D/g, ''),
        customerAddress: customerAddress.trim(),
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.image,
          price: item.price,
          quantity: item.quantity,
          variant: item.variant,
          attributes: item.attributes,
        })),
        couponCode: appliedCoupon?.coupon.code || null,
      }

      // Create order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()

      if (result.success) {
        // Clear cart chỉ khi không phải directProduct
        if (!directProduct) {
          await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [] }),
          })

          // Update cart count
          const cartCountElements = document.getElementsByClassName('cart-count')
          for (let i = 0; i < cartCountElements.length; i++) {
            cartCountElements[i].textContent = '0'
          }
          window.dispatchEvent(new Event('cartUpdated'))
        }

        // Redirect to thank you page
        const thanksUrl = result.data?.id 
          ? `/thanks?order_id=${result.data.id}`
          : '/thanks'
        
        router.push(thanksUrl)
        onClose()


        setCart([])
        setAppliedCoupon(null)
        setCouponInput('')
        setCouponMessage(null)
      } else {
        alert('Lỗi: ' + (result.error || 'Không thể tạo đơn hàng'))
      }
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Lỗi kết nối. Vui lòng thử lại!')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      setCouponMessage({ type: 'error', text: 'Vui lòng nhập mã giảm giá' })
      return
    }
    if (subtotal <= 0) {
      setCouponMessage({ type: 'error', text: 'Giỏ hàng trống' })
      return
    }
    setCouponLoading(true)
    setCouponMessage(null)
    try {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Không thể áp dụng mã giảm giá')
      }
      setAppliedCoupon(result.data)
      setCouponMessage({ type: 'success', text: 'Đã áp dụng mã giảm giá' })
    } catch (error: any) {
      setAppliedCoupon(null)
      setCouponMessage({ type: 'error', text: error.message || 'Mã giảm giá không hợp lệ' })
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponMessage(null)
    setCouponInput('')
  }

  if (!isOpen && !isClosing) return null


  const panelTransformClass = isClosing
    ? 'translate-x-full'
    : isAnimating
      ? 'translate-x-full'
      : 'translate-x-0'

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[70] w-full max-w-[500px] mx-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div
        className={`absolute top-0 right-0 w-full h-full bg-white flex flex-col overflow-hidden transform-gpu transition-transform duration-300 ease-out ${panelTransformClass}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-200 shrink-0">
          <button className="text-lg font-medium" onClick={handleClose}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Tổng quan đơn hàng</h1>
          <div className="w-6" />
        </div>

        <div className="flex-1 overflow-auto bg-white">
          {/* Store Section */}
          <div className="bg-white px-5 py-4 border-b-8 border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span>
                <span className="bg-black text-white text-xs px-1 py-0.5 rounded mr-1">Mall</span>
                <span className="text-base font-semibold text-gray-900 shop-name">Đơn hàng của bạn</span>
              </span>
              <button className="text-sm text-gray-500">Thêm ghi chú ›</button>
            </div>

            {cart.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 bg-gray-50 rounded-lg">
                Giỏ hàng trống. Hãy thêm sản phẩm trước khi thanh toán.
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="px-3 pt-3 pb-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex gap-3">
                      <div className="w-20 h-20 shrink-0 rounded-lg border overflow-hidden bg-gray-50 flex items-center justify-center">
                        <MediaDisplay url={item.image} alt={item.productName} className="w-full h-full object-cover" autoPlay={false} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2">{item.productName}</p>
                        {item.variant && (
                          <p className="text-xs text-gray-500">
                            <span className="text-gray-400 mr-1">Loại:</span>
                            {`${capitalizeWords(item.variant.label)} ${item.variant.value ? `- ${capitalizeWords(item.variant.value)}` : ''}`}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-amber-100 bg-amber-50 text-[11px] text-amber-700">
                            ✓ Chính hãng 100%
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-emerald-100 bg-emerald-50 text-[11px] text-emerald-700">
                            Trả hàng miễn phí
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div>
                            <div className="text-base font-semibold text-rose-600 leading-tight">{formatPrice(item.price)}</div>
                            {(item.regularPrice || (item.discount && item.discount > 0)) && (
                              <div className="flex items-center gap-2 mt-0.5 leading-tight">
                                {item.regularPrice && (
                                  <span className="text-xs text-gray-400 line-through">{formatPrice(item.regularPrice)}</span>
                                )}
                                {item.discount && item.discount > 0 && (
                                  <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                    -{item.discount}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="inline-flex items-stretch overflow-hidden rounded border border-gray-200 bg-gray-50 text-sm">
                            <button
                              className="px-2.5 py-0.5 text-gray-600 hover:bg-gray-100"
                              onClick={() => updateQuantity(index, -1)}
                            >
                              −
                            </button>
                            <span className="px-3 py-0.5 text-xs font-semibold border-x border-gray-200 bg-white min-w-[32px] text-center flex items-center justify-center leading-none">
                              {item.quantity}
                            </span>
                            <button
                              className="px-2.5 py-0.5 text-gray-600 hover:bg-gray-100"
                              onClick={() => updateQuantity(index, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Section */}
          <div className="bg-white px-5 py-4 border-b-8 border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Đảm bảo giao vào 2–4 ngày tới</h3>
            <div className="mb-1">
              <span className="text-sm line-through text-gray-400">34.800₫</span>
              <span className="text-sm text-green-500 font-medium ml-2">Miễn phí</span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Vận chuyển tiêu chuẩn</p>
            <p className="text-xs text-gray-500">Nhận voucher ít nhất 15K₫ nếu đơn giao trễ ⓘ</p>
          </div>

          {/* Voucher Section */}
          <div className="bg-white px-5 py-4 border-b-8 border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-red-500 text-lg">🎫</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Giảm giá từ {storeName}</p>
                <p className="text-xs text-gray-500">Nhập mã để được giảm giá thêm</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                className="flex-1 border rounded-lg px-3 py-2 text-sm uppercase focus:ring focus:ring-pink-200"
                placeholder="Nhập mã giảm giá"
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                  onClick={handleRemoveCoupon}
                >
                  Hủy
                </button>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 text-sm rounded-lg bg-pink-600 text-white font-semibold disabled:opacity-50"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading}
                >
                  {couponLoading ? 'Đang áp dụng...' : 'Áp dụng'}
                </button>
              )}
            </div>
            {couponMessage && (
              <p
                className={`text-xs mt-2 ${couponMessage.type === 'success' ? 'text-green-600' : 'text-red-500'
                  }`}
              >
                {couponMessage.text}
              </p>
            )}
            {appliedCoupon && (
              <div className="mt-2 text-xs text-green-600">
                Đã áp dụng mã {appliedCoupon.coupon.code} • Tiết kiệm{' '}
                {formatPrice(appliedCoupon.discountAmount)}
              </div>
            )}

            {/* List of available coupons */}
            {!appliedCoupon && availableCoupons.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Mã giảm giá có thể áp dụng:</p>
                <div className="flex flex-col gap-2">
                  {availableCoupons.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCouponInput(c.code)}
                      className="text-left bg-pink-50 border border-pink-100 rounded-lg px-3 py-2 text-xs hover:bg-pink-100 transition-colors"
                    >
                      <div className="font-semibold text-pink-700">{c.code}</div>
                      <div className="text-pink-600 mt-0.5">
                        Giảm {c.discount_type === 'percent' ? `${c.discount_value}%` : formatPrice(c.discount_value)}
                        {c.min_order_amount ? ` (Đơn tối thiểu ${formatPrice(c.min_order_amount)})` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white px-5 py-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Tóm tắt đơn hàng</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Tổng phụ sản phẩm</span>
                <span className="text-gray-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Tổng phụ vận chuyển</span>
                <span className="text-gray-900">0đ</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Giảm giá</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-end mb-4 pt-3 border-t border-gray-200">
                <div>
                  <p className="text-base text-gray-900">Tổng ({cartSummary.count} mặt hàng)</p>
                  <p className="text-xs text-red-500">Tiết kiệm 26%</p>
                </div>
                <span className="text-lg font-semibold text-red-500">{formatPrice(finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="bg-white px-5 pt-5 border-t-8 border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Phương thức thanh toán</h3>
            <div className="py-2 flex items-start gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">COD</span>
                  <span className="font-semibold">Thanh toán khi giao</span>
                </div>
                <p className="text-gray-500 text-sm mt-1">Không cần trả trước - thanh toán khi đơn giao đến.</p>
              </label>
            </div>
          </div>

          {/* Form Section */}
          <div className="space-y-3 py-5 px-5">
            <div>
              <label className="block text-sm font-medium mb-1">Tên khách hàng</label>
              <input
                id="nameInput"
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value)
                  if (errors.name) {
                    setErrors({ ...errors, name: '' })
                  }
                }}
                className={`w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-300 ${errors.name ? 'border-red-500' : ''
                  }`}
                placeholder="Nguyễn Văn A"
              />
              {errors.name && (
                <div id="nameError" className="text-red-500 text-xs mt-1">
                  {errors.name}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số điện thoại</label>
              <input
                id="phoneInput"
                type="tel"
                value={customerPhone}
                onChange={(e) => {
                  // Chỉ cho phép số, giới hạn 10 số
                  let value = e.target.value.replace(/\D/g, '')

                  // Giới hạn tối đa 10 số
                  if (value.length > 10) {
                    value = value.slice(0, 10)
                  }

                  // Format hiển thị: 0123 456 789
                  let formatted = value
                  if (value.length > 4) {
                    formatted = value.slice(0, 4) + ' ' + value.slice(4)
                  }
                  if (value.length > 7) {
                    formatted = value.slice(0, 4) + ' ' + value.slice(4, 7) + ' ' + value.slice(7)
                  }

                  setCustomerPhone(formatted)
                  if (errors.phone) {
                    setErrors({ ...errors, phone: '' })
                  }
                }}
                onBlur={(e) => {
                  // Validate khi blur
                  const phoneDigits = customerPhone.replace(/\D/g, '')
                  if (phoneDigits.length > 0 && phoneDigits.length !== 10) {
                    setErrors({ ...errors, phone: 'Số điện thoại phải có đúng 10 số.' })
                  } else if (phoneDigits.length === 10 && !phoneDigits.startsWith('0')) {
                    setErrors({ ...errors, phone: 'Số điện thoại phải bắt đầu bằng số 0.' })
                  }
                }}
                maxLength={12} // 10 số + 2 khoảng trắng
                className={`w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-300 ${errors.phone ? 'border-red-500' : ''
                  }`}
                placeholder="0123 456 789"
              />
              {errors.phone && (
                <div id="phoneError" className="text-red-500 text-xs mt-1">
                  {errors.phone}
                </div>
              )}
              {customerPhone.replace(/\D/g, '').length > 0 && customerPhone.replace(/\D/g, '').length < 10 && (
                <div className="text-gray-500 text-xs mt-1">
                  Còn {10 - customerPhone.replace(/\D/g, '').length} số
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Địa chỉ nhận hàng</label>
              <textarea
                id="addressInput"
                rows={3}
                value={customerAddress}
                onChange={(e) => {
                  setCustomerAddress(e.target.value)
                  if (errors.address) {
                    setErrors({ ...errors, address: '' })
                  }
                }}
                className={`w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-300 ${errors.address ? 'border-red-500' : ''
                  }`}
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
              />
              {errors.address && (
                <div id="addressError" className="text-red-500 text-xs mt-1">
                  {errors.address}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t bg-white shrink-0">
          <div className="px-5 py-3 border-b">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Tổng cộng:</span>
              <span className="font-bold text-lg text-red-600">{formatPrice(finalTotal)}</span>
            </div>
          </div>
          <div className="p-5">
            <button
              id="orderButton"
              onClick={handleSubmit}
              disabled={isSubmitting || cart.length === 0}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-lg font-semibold shadow disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
              {isSubmitting ? (
                'Đang xử lý...'
              ) : (
                <div className="flex flex-col leading-tight">
                  <span className="text-base">Đặt hàng</span>
                  <span className="text-[11px] font-normal">
                    Ưu đãi kết thúc sau {formatCountdown(orderCountdown)} | Freeship
                  </span>
                </div>
              )}
            </button>
            <p className="text-center text-xs text-gray-500 mt-2">Đảm bảo hoàn tiền nếu đơn không thành công</p>
        </div>
      </div>
    </div>
  </div>
)
}

