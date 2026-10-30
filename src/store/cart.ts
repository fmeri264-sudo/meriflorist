import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, Product } from '@/types'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (product: Product, size: 'S' | 'M' | 'L') => void
  removeItem: (productId: number, size: string) => void
  updateQty: (productId: number, size: string, qty: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  total: () => number
  count: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, size) => {
        const price =
          size === 'L' && product.priceL
            ? product.priceL
            : product.price

        set((state) => {
          const existing = state.items.find(
            (i) => i.product.id === product.id && i.size === size
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id && i.size === size
                  ? { ...i, qty: i.qty + 1 }
                  : i
              ),
              isOpen: true,
            }
          }
          return {
            items: [...state.items, { product, size, qty: 1, price }],
            isOpen: true,
          }
        })
      },

      removeItem: (productId, size) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.product.id === productId && i.size === size)
          ),
        })),

      updateQty: (productId, size, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter(
                  (i) => !(i.product.id === productId && i.size === size)
                )
              : state.items.map((i) =>
                  i.product.id === productId && i.size === size
                    ? { ...i, qty }
                    : i
                ),
        })),

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      total: () =>
        get().items.reduce((sum, i) => sum + i.price * i.qty, 0),

      count: () =>
        get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: 'meriflorist-cart', skipHydration: true }
  )
)
