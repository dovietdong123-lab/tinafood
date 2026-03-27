import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { fetchActiveCoupons } from '@/lib/coupons'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const identifier = params.id
    const isNumericId = /^\d+$/.test(identifier)
    const identifierValue = isNumericId ? parseInt(identifier, 10) : identifier

    // Lấy thông tin sản phẩm
    const products = await query(
      `SELECT 
        id,
        slug,
        name,
        price,
        regular_price as regular,
        discount,
        image,
        description,
        gallery,
        sold,
        status,
        attributes
      FROM products
      WHERE ${isNumericId ? 'id' : 'slug'} = ? AND status = 'active'`,
      [identifierValue]
    )

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      )
    }

    const product = products[0] as any

    // Parse gallery nếu là JSON string
    let gallery = []
    if (product.gallery) {
      try {
        gallery = typeof product.gallery === 'string' 
          ? JSON.parse(product.gallery) 
          : product.gallery
      } catch {
        gallery = [product.image]
      }
    } else {
      gallery = [product.image]
    }

    // Lấy variants từ product_variants table (nếu có)
    const variantsResult = await query(
      `SELECT 
        id,
        label,
        value,
        price,
        regular_price as regular,
        discount,
        image
      FROM product_variants
      WHERE product_id = ?`,
      [product.id]
    )

    // Map variants từ product_variants table
    let variantsFromTable: any[] = []
    if (Array.isArray(variantsResult) && variantsResult.length > 0) {
      variantsFromTable = variantsResult.map((v: any) => ({
        id: v.id,
        label: v.label || '',
        value: v.value || '',
        price: Number(v.price) || 0,
        regular: Number(v.regular) || 0,
        discount: Number(v.discount) || 0,
        image: v.image || null,
      }))
    }

    // Lấy variants từ attributes field (nếu có)
    let variantsFromAttributes: any[] = []
    if (product.attributes) {
      try {
        let attributes = product.attributes
        if (typeof attributes === 'string') {
          attributes = JSON.parse(attributes)
        }
        
        if (Array.isArray(attributes) && attributes.length > 0) {
          // Chuyển đổi attributes thành variants (flat list)
          const basePrice = Number(product.price) || 0
          const baseRegular = Number(product.regular) || basePrice
          const baseDiscount = Number(product.discount) || 0

          attributes.forEach((attr: any, attrIndex: number) => {
            if (attr.values && Array.isArray(attr.values)) {
              attr.values.forEach((rawValueObj: any, valueIndex: number) => {
                const valueObj =
                  typeof rawValueObj === 'string' ? { value: rawValueObj } : rawValueObj || {}
                const variantPrice = parseVariantNumber(valueObj.price, basePrice)
                const variantRegular = parseVariantNumber(valueObj.regular, baseRegular)
                const variantDiscount = parseVariantNumber(valueObj.discount, baseDiscount)

                variantsFromAttributes.push({
                  id: `attr_${attrIndex}_${valueIndex}`,
                  label: attr.name || '',
                  value: valueObj.value || '',
                  price: variantPrice,
                  regular: variantRegular,
                  discount: variantDiscount,
                  image: valueObj.image || product.image || null,
                })
              })
            }
          })
        }
      } catch (error) {
        console.error('Error parsing attributes:', error)
      }
    }

    // Ưu tiên variants từ product_variants table, nếu không có thì dùng từ attributes
    const variants = variantsFromTable.length > 0 ? variantsFromTable : variantsFromAttributes

    console.log('Variants fetched for product', product.id, ':', {
      fromTable: variantsFromTable.length,
      fromAttributes: variantsFromAttributes.length,
      final: variants.length,
      variants: variants
    })

    // Lấy recommended products (cùng category hoặc random)
    const recommended = await query(
      `SELECT 
        id,
        slug,
        name,
        price,
        regular_price as regular,
        discount,
        image,
        attributes
      FROM products
      WHERE id != ? AND status = 'active'
      ORDER BY RAND()
      LIMIT 6`,
      [product.id]
    )

    // Lấy reviews
    const reviews = await query(
      `SELECT 
        id,
        content,
        rating,
        user_name,
        avatar,
        gallery,
        created_at
      FROM product_reviews
      WHERE product_id = ? AND status = 'approved'
      ORDER BY created_at DESC
      LIMIT 5`,
      [product.id]
    )

    const coupons = await fetchActiveCoupons()

    const responseData = {
      ...product,
      gallery,
      variants: variants,
      recommended: Array.isArray(recommended) ? recommended : [],
      reviews: Array.isArray(reviews)
        ? reviews.map((review: any) => ({
            ...review,
            images: parseReviewGallery(review.gallery),
          }))
        : [],
      coupons,
    }

    console.log('Response data variants:', responseData.variants)

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error: any) {
    console.error('Error fetching product detail:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch product detail',
      },
      { status: 500 }
    )
  }
}

// PUT - Cập nhật sản phẩm
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { name, price, regular_price, discount, image, description } = body

    await query(
      `UPDATE products 
       SET name = ?, price = ?, regular_price = ?, discount = ?, image = ?, description = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, price, regular_price, discount, image, description, id]
    )

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update product',
      },
      { status: 500 }
    )
  }
}

// DELETE - Xóa sản phẩm
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id)

    // Hard delete: xóa các bản ghi liên quan ở những bảng phụ trước, sau đó xóa sản phẩm chính
    await query(`DELETE FROM product_variants WHERE product_id = ?`, [id])
    await query(`DELETE FROM product_reviews WHERE product_id = ?`, [id])
    await query(`DELETE FROM products WHERE id = ?`, [id])

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete product',
      },
      { status: 500 }
    )
  }
}

function parseReviewGallery(gallery: any): string[] {
  if (!gallery) return []
  if (Array.isArray(gallery)) {
    return gallery.filter((url) => typeof url === 'string' && url.trim() !== '').map((url) => url.trim())
  }
  if (typeof gallery === 'string') {
    try {
      const parsed = JSON.parse(gallery)
      if (Array.isArray(parsed)) {
        return parsed.filter((url: any) => typeof url === 'string' && url.trim() !== '').map((url: string) => url.trim())
      }
    } catch {
      return gallery.trim() ? [gallery.trim()] : []
    }
  }
  return []
}

const parseVariantNumber = (value: any, fallback: number) => {
  if (value === undefined || value === null || value === '') return fallback
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

