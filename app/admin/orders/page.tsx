'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

interface OrderItem {
  id: number
  product_id: number
  product_name: string
  product_image?: string
  price: number
  quantity: number
  subtotal: number
}

interface Order {
  id: number
  customer_name: string
  customer_phone: string
  customer_address: string
  total_amount: number
  discount_amount: number
  final_amount: number
  coupon_code?: string | null
  status: OrderStatus
  created_at: string
  updated_at: string
  item_count: number
  items: OrderItem[]
}

const STATUS_OPTIONS: { value: 'all' | OrderStatus; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'shipped', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const STATUS_BADGE: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Chờ xử lý', className: 'bg-yellow-100 text-yellow-700' },
  processing: { label: 'Đang xử lý', className: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Đang giao', className: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Đã giao', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<number | null>(null)

  useEffect(() => {
    fetchOrders(statusFilter)
  }, [statusFilter])

  const fetchOrders = async (status: 'all' | OrderStatus) => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('admin_token')
      let url = '/api/admin/orders'
      if (status !== 'all') {
        url += `?status=${status}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        if (response.status === 401) {
          window.location.href = '/admin/login'
          return
        }
        throw new Error(result.error || 'Không thể tải danh sách đơn hàng')
      }

      setOrders(result.data || [])
    } catch (err: any) {
      console.error('Error fetching orders:', err)
      setOrders([])
      setError(err.message || 'Đã xảy ra lỗi khi tải đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
      setUpdatingStatus(orderId)
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        if (response.status === 401) {
          window.location.href = '/admin/login'
          return
        }
        throw new Error(result.error || 'Không thể cập nhật trạng thái đơn hàng')
      }

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        )
      )
    } catch (err: any) {
      console.error('Error updating order status:', err)
      alert(err.message || 'Đã xảy ra lỗi khi cập nhật trạng thái')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleDeleteOrder = async (orderId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này? Việc xóa sẽ xóa hoàn toàn thông tin trong hệ thống.')) {
      return
    }

    try {
      setDeletingOrder(orderId)
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        if (response.status === 401) {
          window.location.href = '/admin/login'
          return
        }
        throw new Error(result.error || 'Không thể xóa đơn hàng')
      }

      // Xóa thành công, cập nhật state
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId))
    } catch (err: any) {
      console.error('Error deleting order:', err)
      alert(err.message || 'Đã xảy ra lỗi khi xóa đơn hàng')
    } finally {
      setDeletingOrder(null)
    }
  }

  const handleCopyOrder = async (order: Order) => {
    try {
      const itemsText = order.items
        .map((item) => `- ${item.product_name} x${item.quantity} (${(item.subtotal || 0).toLocaleString('vi-VN')}đ)`)
        .join('\n')
      
      const copyText = `MÃ ĐƠN HÀNG: #${order.id}
Tên khách hàng: ${order.customer_name}
Số điện thoại: ${order.customer_phone}
Địa chỉ giao hàng: ${order.customer_address}

Danh sách sản phẩm:
${itemsText}

Tổng cộng: ${order.totalLabel}`

      await navigator.clipboard.writeText(copyText)
      alert('Đã copy thông tin đơn hàng vào bộ nhớ tạm (Clipboard)!')
    } catch (error) {
      console.error('Copy failed', error)
      alert('Không thể copy thông tin, trình duyệt của bạn có thể không hỗ trợ tính năng này.')
    }
  }

  const renderSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="border rounded-lg bg-white shadow animate-pulse">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-8 w-24 bg-gray-200 rounded-full" />
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-5/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const formattedOrders = useMemo(
    () =>
      orders.map((order) => ({
        ...order,
        createdLabel: new Date(order.created_at).toLocaleString('vi-VN'),
        updatedLabel: new Date(order.updated_at).toLocaleString('vi-VN'),
        subtotalLabel: Number(order.total_amount || 0).toLocaleString('vi-VN') + 'đ',
        discountLabel: Number(order.discount_amount || 0).toLocaleString('vi-VN') + 'đ',
        totalLabel: Number((order.final_amount ?? order.total_amount) || 0).toLocaleString('vi-VN') + 'đ',
      })),
    [orders]
  )

  return (
    <AdminLayout title="Đơn hàng">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Danh sách đơn hàng</h1>
          <p className="text-sm text-gray-500">
            {loading ? 'Đang tải...' : `Tổng cộng ${orders.length} đơn hàng`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="order-status-filter" className="text-sm font-medium text-gray-600">
            Lọc trạng thái
          </label>
          <select
            id="order-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        renderSkeleton()
      ) : formattedOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-10 text-center text-gray-500">
          Chưa có đơn hàng nào{' '}
          {statusFilter !== 'all' ? `ở trạng thái "${STATUS_BADGE[statusFilter].label}"` : 'được ghi nhận' }.
        </div>
      ) : (
        <div className="space-y-5">
          {formattedOrders.map((order) => {
            const badge = STATUS_BADGE[order.status]
            return (
              <div key={order.id} className="rounded-xl border bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm text-gray-500">Mã đơn</span>
                    <span className="text-lg font-semibold text-gray-900">#{order.id}</span>
                  </div>
                <div className="flex flex-col text-sm text-gray-500">
                  <span>Tạo lúc {order.createdLabel}</span>
                  <span>Cập nhật {order.updatedLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                    disabled={updatingStatus === order.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {Object.entries(STATUS_BADGE).map(([value, { label }]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {updatingStatus === order.id && (
                    <span className="text-xs text-gray-500">Đang cập nhật...</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">Tổng thanh toán</span>
                  <div className="text-xl font-bold text-gray-900">{order.totalLabel}</div>
                  <div className="text-xs text-gray-500">Tạm tính: {order.subtotalLabel}</div>
                  {Number(order.discount_amount || 0) > 0 && (
                    <div className="text-xs text-green-600">
                      Giảm: -{order.discountLabel}
                      {order.coupon_code ? ` (${order.coupon_code})` : ''}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-stretch gap-2 ml-2 pl-4 border-l border-gray-100 shrink-0">
                  <button
                    onClick={() => handleCopyOrder(order)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 focus:ring-2 focus:ring-gray-200"
                  >
                    Copy đơn
                  </button>
                  <button
                    onClick={() => handleDeleteOrder(order.id)}
                    disabled={deletingOrder === order.id}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingOrder === order.id ? 'Đang xóa' : 'Xóa đơn'}
                  </button>
                </div>
                </div>

                <div className="grid gap-4 px-5 py-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Khách hàng</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{order.customer_name}</p>
                    <p className="text-sm text-gray-600">📞 {order.customer_phone}</p>
                    <p className="text-sm text-gray-600">📍 {order.customer_address}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Sản phẩm ({order.item_count})
                    </p>
                    <div className="mt-2 space-y-2">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-start justify-between rounded border px-3 py-2 text-sm">
                          <div className="flex-1 pr-3">
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                            <p className="text-xs text-gray-500">SL: {item.quantity}</p>
                          </div>
                          <div className="text-right text-sm text-gray-700">
                            {(item.subtotal || 0).toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-gray-400">
                          +{order.items.length - 3} sản phẩm khác
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}

