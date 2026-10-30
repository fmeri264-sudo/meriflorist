import ProductForm from '../../ProductForm'
import { notFound } from 'next/navigation'

const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_ANON_KEY!

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const res = await fetch(`${SB_URL}/rest/v1/Product?id=eq.${id}&limit=1`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    cache: 'no-store',
  })
  const rows = await res.json()
  const product = rows[0]
  if (!product) notFound()

  return (
    <ProductForm
      productId={product.id}
      initialData={{
        name: product.name,
        slug: product.slug,
        description: product.description ?? '',
        composition: product.composition ?? '',
        price: String(product.price),
        images: product.images as string[],
        video: product.video ?? '',
        inStock: product.inStock,
        isHit: product.isHit,
        isNew: product.isNew,
        tags: (product.tags as string[]).join(', '),
        categoryIds: (product.categoryIds as number[])?.length
          ? (product.categoryIds as number[])
          : product.categoryId ? [product.categoryId as number] : [],
        sectionIds: (product.sectionIds as number[]) ?? [],
        occasionIds: (product.occasionIds as number[]) ?? [],
        colors: (product.colors as string[]) ?? [],
        packaging: product.packaging ?? '',
        flowerCount: product.flowerCount != null ? String(product.flowerCount) : '',
        sku: product.sku ?? '',
        popularInDistricts: (product.popularInDistricts as string[]) ?? [],
        width: product.width != null ? String(product.width) : '',
        height: product.height != null ? String(product.height) : '',
        groupId: product.groupId ?? '',
        isAddon: product.isAddon ?? false,
        addonCategory: product.addonCategory ?? '',
      }}
    />
  )
}
