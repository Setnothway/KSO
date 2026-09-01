// ============================================
// ЭТАП 4: UI и Брендирование - Компонент корзины (CartView)
// ============================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cart, CartItem } from '@shared/types';

interface CartViewProps {
  cart: Cart;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onBackToShopping: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  cart,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onBackToShopping,
}) => {
  const formatPrice = (priceKopecks: number): string => {
    const rubles = priceKopecks / 100;
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(rubles);
  };

  const getItemId = (item: CartItem): string => {
    return item.product.id;
  };

  return (
    <div className="flex flex-col h-full bg-brand-surface rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-3xl font-bold text-brand-text" style={{ fontFamily: 'var(--font-heading)' }}>
          Ваша корзина
        </h2>
        <button
          onClick={onClearCart}
          className="min-h-[48px] min-w-[48px] px-6 py-3 text-lg font-medium text-brand-error 
                     border-2 border-brand-error rounded-xl hover:bg-red-50 transition-colors
                     focus:outline-none focus:ring-4 focus:ring-brand-error/30"
          aria-label="Очистить корзину"
        >
          Очистить всё
        </button>
      </header>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-6">
        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-brand-text-secondary">
            <svg
              className="w-32 h-32 mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p className="text-2xl">Корзина пуста</p>
            <p className="text-lg mt-2">Отсканируйте товары для добавления</p>
          </div>
        ) : (
          <ul className="space-y-4">
            <AnimatePresence mode="popLayout">
              {cart.items.map((item) => (
                <CartItemRow
                  key={getItemId(item)}
                  item={item}
                  onRemove={() => onRemoveItem(getItemId(item))}
                  formatPrice={formatPrice}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Footer with Totals and Actions */}
      <footer className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-lg text-brand-text-secondary">
            <span>Подытог:</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </div>
          {cart.totalDiscount > 0 && (
            <div className="flex justify-between text-lg text-brand-success">
              <span>Скидка:</span>
              <span>-{formatPrice(cart.totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-4xl font-bold text-brand-text pt-4 border-t border-gray-300">
            <span>Итого:</span>
            <span style={{ color: 'var(--brand-primary)' }}>{formatPrice(cart.total)}</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBackToShopping}
            className="flex-1 min-h-[64px] px-8 py-4 text-xl font-semibold text-brand-text 
                       bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-100 transition-colors
                       focus:outline-none focus:ring-4 focus:ring-gray-300"
          >
            Вернуться к покупкам
          </button>
          <button
            onClick={onCheckout}
            disabled={cart.items.length === 0}
            className="flex-[2] min-h-[64px] px-8 py-4 text-xl font-semibold text-white 
                       bg-brand-primary rounded-xl hover:opacity-90 transition-opacity
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-4 focus:ring-brand-primary/50
                       shadow-lg hover:shadow-xl"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            Оплатить {formatPrice(cart.total)}
          </button>
        </div>
      </footer>
    </div>
  );
};

// --- Подкомпонент строки товара ---

interface CartItemRowProps {
  item: CartItem;
  onRemove: () => void;
  formatPrice: (price: number) => string;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item, onRemove, formatPrice }) => {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100"
    >
      {/* Product Image Placeholder */}
      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        {item.product.imageUrl ? (
          <img
            src={item.product.imageUrl}
            alt={item.product.name}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-medium text-brand-text truncate">{item.product.name}</h3>
        <p className="text-sm text-brand-text-secondary">
          {item.quantity} шт. × {formatPrice(item.product.price)}
        </p>
        {item.product.isAgeRestricted && (
          <span className="inline-block mt-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded">
            18+
          </span>
        )}
      </div>

      {/* Total Price */}
      <div className="text-right flex-shrink-0">
        <p className="text-xl font-bold text-brand-text">{formatPrice(item.totalPrice)}</p>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="min-h-[48px] min-w-[48px] flex items-center justify-center 
                   text-brand-text-secondary hover:text-brand-error transition-colors
                   focus:outline-none focus:ring-4 focus:ring-brand-error/30 rounded-lg"
        aria-label={`Удалить ${item.product.name}`}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </motion.li>
  );
};

export default CartView;
