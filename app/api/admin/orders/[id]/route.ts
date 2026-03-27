import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// GET - Lấy chi tiết đơn hàng
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth() // Check authentication
  } catch (error: any) {
    console.error('Auth error in GET /api/admin/orders/[id]:', error)
    return NextResponse.json({ success: false, error: 'Unauthorized - ' + (error.message || 'Invalid session') }, { status: 401 })
  }
  try {
    const id = parseInt(params.id)

    const orders = await query('SELECT * FROM orders WHERE id = ?', [id])

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
        },
        { status: 404 }
      )
    }

    const order = orders[0] as any

    // Get order items
    const items = await query('SELECT * FROM order_items WHERE order_id = ?', [id])

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        items: items || [],
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch order',
      },
      { status: 500 }
    )
  }
}

// PUT - Cập nhật trạng thái đơn hàng
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth() // Check authentication
  } catch (error: any) {
    console.error('Auth error in PUT /api/admin/orders/[id]:', error)
    return NextResponse.json({ success: false, error: 'Unauthorized - ' + (error.message || 'Invalid session') }, { status: 401 })
  }
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Status is required',
        },
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status',
        },
        { status: 400 }
      )
    }

    await query('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', [status, id])

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update order',
      },
      { status: 500 }
    )
  }
}

// DELETE - Xóa đơn hàng
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth() // Check authentication
  } catch (error: any) {
    console.error('Auth error in DELETE /api/admin/orders/[id]:', error)
    return NextResponse.json({ success: false, error: 'Unauthorized - ' + (error.message || 'Invalid session') }, { status: 401 })
  }
  try {
    const id = parseInt(params.id)

    // Xóa order_items trước để tránh lỗi foreign key constraint (nếu có)
    await query('DELETE FROM order_items WHERE order_id = ?', [id])
    // Xóa order
    await query('DELETE FROM orders WHERE id = ?', [id])

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete order',
      },
      { status: 500 }
    )
  }
}

