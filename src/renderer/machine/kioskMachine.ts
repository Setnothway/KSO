// ============================================
// ЭТАП 3: Машина Состояний (XState)
// ============================================

import { setup, assign, fromPromise, ActorLogicFrom } from 'xstate';
import { Product, Cart, CartItem, ScanEvent, ThemeConfig } from '@shared/types';

// --- Context (состояние данных) ---

export interface KioskContext {
  currentSessionId: string;
  cart: Cart;
  selectedLanguage: 'ru' | 'en' | 'uz' | 'tg';
  theme: ThemeConfig | null;
  loyaltyCardNumber?: string;
  ageVerified: boolean;
  lastScannedBarcode?: string;
  errorMessage?: string;
  retryCount: number;
}

// --- Events (события) ---

export type KioskEvent =
  // Навигация
  | { type: 'START_SESSION' }
  | { type: 'SELECT_LANGUAGE'; language: 'ru' | 'en' | 'uz' | 'tg' }
  | { type: 'CANCEL_SESSION' }
  
  // Лояльность
  | { type: 'SCAN_LOYALTY_CARD'; cardNumber: string }
  | { type: 'SKIP_LOYALTY' }
  
  // Сканирование товаров
  | { type: 'SCAN_PRODUCT'; barcode: string }
  | { type: 'MANUAL_ENTER_PRODUCT'; barcode: string }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'CLEAR_CART' }
  | { type: 'WEIGHT_MEASURED'; weight: number }
  
  // Проверка возраста
  | { type: 'AGE_VERIFIED'; verified: boolean }
  | { type: 'CALL_OPERATOR_FOR_AGE' }
  | { type: 'OPERATOR_APPROVED' }
  | { type: 'OPERATOR_DENIED' }
  
  // Корзина и оплата
  | { type: 'PROCEED_TO_CHECKOUT' }
  | { type: 'BACK_TO_SHOPPING' }
  | { type: 'SELECT_PAYMENT_METHOD'; method: 'card' | 'sbp' | 'cash' }
  
  // Оплата
  | { type: 'PAYMENT_INITIATED' }
  | { type: 'PAYMENT_SUCCESS'; transactionId: string }
  | { type: 'PAYMENT_FAILED'; reason: string }
  | { type: 'PAYMENT_CANCELLED' }
  
  // Чек
  | { type: 'RECEIPT_PRINTED' }
  | { type: 'SEND_RECEIPTByEmail'; email: string }
  | { type: 'FINISH_TRANSACTION' }
  
  // Ошибки
  | { type: 'HARDWARE_ERROR'; device: string; errorCode: string; message: string }
  | { type: 'ACKNOWLEDGE_ERROR' }
  | { type: 'CALL_OPERATOR' }
  | { type: 'OPERATOR_ARRIVED' }
  
  // Таймауты (возврат в IDLE при бездействии)
  | { type: 'IDLE_TIMEOUT' };

// --- Guards (условия переходов) ---

const hasItemsInCart = ({ context }: { context: KioskContext }) => context.cart.items.length > 0;
const isAgeRestrictedInCart = ({ context }: { context: KioskContext }) => 
  context.cart.items.some(item => item.product.isAgeRestricted);
const isAgeVerified = ({ context }: { context: KioskContext }) => context.ageVerified;
const hasLoyaltyCard = ({ context }: { context: KioskContext }) => !!context.loyaltyCardNumber;

// --- Actions (действия) ---

const initializeSession = assign({
  currentSessionId: () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  cart: () => ({
    items: [],
    subtotal: 0,
    totalDiscount: 0,
    total: 0,
    appliedPromotions: [],
  }),
  loyaltyCardNumber: undefined,
  ageVerified: false,
  lastScannedBarcode: undefined,
  errorMessage: undefined,
  retryCount: 0,
});

const addProductToCart = assign({
  cart: ({ context, event }) => {
    if (event.type !== 'SCAN_PRODUCT' && event.type !== 'MANUAL_ENTER_PRODUCT') {
      return context.cart;
    }
    
    const barcode = event.barcode;
    // Здесь должен быть вызов к базе данных для получения товара
    // Для примера создаем моковый товар
    const mockProduct: Product = {
      id: `prod_${barcode}`,
      barcode,
      name: `Товар ${barcode}`,
      price: Math.floor(Math.random() * 10000) + 100,
      category: 'general',
      isAgeRestricted: barcode.startsWith('9'),
    };
    
    const existingItemIndex = context.cart.items.findIndex(
      item => item.product.barcode === barcode
    );
    
    let newItems: CartItem[];
    if (existingItemIndex >= 0) {
      newItems = [...context.cart.items];
      newItems[existingItemIndex] = {
        ...newItems[existingItemIndex],
        quantity: newItems[existingItemIndex].quantity + 1,
        totalPrice: newItems[existingItemIndex].totalPrice + mockProduct.price,
      };
    } else {
      newItems = [
        ...context.cart.items,
        {
          product: mockProduct,
          quantity: 1,
          totalPrice: mockProduct.price,
          scannedAt: new Date(),
        },
      ];
    }
    
    const subtotal = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    return {
      ...context.cart,
      items: newItems,
      subtotal,
      total: subtotal - context.cart.totalDiscount,
    };
  },
  lastScannedBarcode: ({ event }) => {
    if (event.type === 'SCAN_PRODUCT' || event.type === 'MANUAL_ENTER_PRODUCT') {
      return event.barcode;
    }
    return undefined;
  },
});

const removeItemFromCart = assign({
  cart: ({ context, event }) => {
    if (event.type !== 'REMOVE_ITEM') {
      return context.cart;
    }
    
    const newItems = context.cart.items.filter(item => item.product.id !== event.itemId);
    const subtotal = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    return {
      ...context.cart,
      items: newItems,
      subtotal,
      total: subtotal - context.cart.totalDiscount,
    };
  },
});

const setLoyaltyCard = assign({
  loyaltyCardNumber: ({ event }) => {
    if (event.type === 'SCAN_LOYALTY_CARD') {
      return event.cardNumber;
    }
    return undefined;
  },
});

const setLanguage = assign({
  selectedLanguage: ({ event }) => {
    if (event.type === 'SELECT_LANGUAGE') {
      return event.language;
    }
    return context.selectedLanguage;
  },
});

const setAgeVerified = assign({
  ageVerified: ({ event }) => {
    if (event.type === 'AGE_VERIFIED') {
      return event.verified;
    }
    return false;
  },
});

const setError = assign({
  errorMessage: ({ event }) => {
    if (event.type === 'HARDWARE_ERROR') {
      return event.message;
    }
    return undefined;
  },
  retryCount: ({ context, event }) => {
    if (event.type === 'HARDWARE_ERROR') {
      return context.retryCount + 1;
    }
    return context.retryCount;
  },
});

const clearError = assign({
  errorMessage: () => undefined,
  retryCount: () => 0,
});

// --- Machine Definition ---

export const kioskMachine = setup({
  types: {} as {
    context: KioskContext;
    events: KioskEvent;
  },
  guards: {
    hasItemsInCart,
    isAgeRestrictedInCart,
    isAgeVerified,
    hasLoyaltyCard,
  },
  actions: {
    initializeSession,
    addProductToCart,
    removeItemFromCart,
    setLoyaltyCard,
    setLanguage,
    setAgeVerified,
    setError,
    clearError,
  },
}).createMachine({
  id: 'kiosk',
  initial: 'IDLE',
  context: {
    currentSessionId: '',
    cart: {
      items: [],
      subtotal: 0,
      totalDiscount: 0,
      total: 0,
      appliedPromotions: [],
    },
    selectedLanguage: 'ru',
    theme: null,
    ageVerified: false,
    retryCount: 0,
  },
  states: {
    IDLE: {
      description: 'Режим привлечения внимания. Анимация, реклама, выбор языка.',
      entry: ['initializeSession'],
      on: {
        SELECT_LANGUAGE: {
          target: 'LOYALTY',
          actions: ['setLanguage'],
        },
      },
      after: {
        300000: { // 5 минут бездействия
          actions: ['initializeSession'],
        },
      },
    },
    
    LOYALTY: {
      description: 'Сканирование карты лояльности или пропуск.',
      on: {
        SCAN_LOYALTY_CARD: {
          actions: ['setLoyaltyCard'],
          target: 'SHOPPING',
        },
        SKIP_LOYALTY: 'SHOPPING',
      },
      after: {
        30000: 'SHOPPING', // Авто-пропуск через 30 сек
      },
    },
    
    SHOPPING: {
      description: 'Основной режим сканирования товаров.',
      on: {
        SCAN_PRODUCT: {
          actions: ['addProductToCart'],
          target: 'SHOPPING', // Остаемся в том же состоянии
        },
        MANUAL_ENTER_PRODUCT: {
          actions: ['addProductToCart'],
          target: 'SHOPPING',
        },
        REMOVE_ITEM: {
          actions: ['removeItemFromCart'],
          target: 'SHOPPING',
        },
        CLEAR_CART: {
          actions: [{ type: 'assign', params: { cart: { items: [], subtotal: 0, totalDiscount: 0, total: 0, appliedPromotions: [] } } }],
          target: 'SHOPPING',
        },
        PROCEED_TO_CHECKOUT: {
          guard: 'hasItemsInCart',
          target: 'CHECKOUT_REVIEW',
        },
        CANCEL_SESSION: 'IDLE',
      },
      invoke: {
        src: 'waitForScanner',
        id: 'scannerListener',
      },
    },
    
    AGE_CHECK: {
      description: 'Ожидание проверки возраста для алкогольной/табачной продукции.',
      entry: ['setError'],
      on: {
        CALL_OPERATOR_FOR_AGE: 'WAITING_OPERATOR_AGE',
        AGE_VERIFIED: {
          guard: ({ event }) => event.verified === true,
          target: 'SHOPPING',
          actions: ['setAgeVerified', 'clearError'],
        },
        CANCEL_SESSION: 'IDLE',
      },
    },
    
    WAITING_OPERATOR_AGE: {
      description: 'Ожидание прихода оператора для проверки возраста.',
      on: {
        OPERATOR_APPROVED: {
          target: 'SHOPPING',
          actions: ['setAgeVerified', 'clearError'],
        },
        OPERATOR_DENIED: {
          target: 'SHOPPING',
          actions: [{ type: 'assign', params: { ageVerified: false } }],
        },
        CANCEL_SESSION: 'IDLE',
      },
    },
    
    CHECKOUT_REVIEW: {
      description: 'Просмотр корзины перед оплатой.',
      on: {
        BACK_TO_SHOPPING: 'SHOPPING',
        CLEAR_CART: {
          actions: [{ type: 'assign', params: { cart: { items: [], subtotal: 0, totalDiscount: 0, total: 0, appliedPromotions: [] } } }],
          target: 'SHOPPING',
        },
        REMOVE_ITEM: {
          actions: ['removeItemFromCart'],
          target: 'CHECKOUT_REVIEW',
        },
        SELECT_PAYMENT_METHOD: {
          target: 'PAYMENT',
          reenter: true,
        },
        CANCEL_SESSION: 'IDLE',
      },
    },
    
    PAYMENT: {
      description: 'Процесс оплаты.',
      initial: 'INITIALIZING',
      states: {
        INITIALIZING: {
          entry: [{ type: 'assign', params: { paymentStatus: 'pending' } }],
          on: {
            PAYMENT_INITIATED: 'PROCESSING',
            PAYMENT_FAILED: {
              target: 'FAILED',
              actions: ['setError'],
            },
          },
        },
        PROCESSING: {
          on: {
            PAYMENT_SUCCESS: {
              target: 'SUCCESS',
              actions: [{ type: 'assign', params: { paymentStatus: 'success' } }],
            },
            PAYMENT_FAILED: {
              target: 'FAILED',
              actions: ['setError'],
            },
            PAYMENT_CANCELLED: 'CANCELLED',
          },
        },
        SUCCESS: {
          entry: [{ type: 'assign', params: { paymentStatus: 'success' } }],
          always: '#kiosk.RECEIPT',
        },
        FAILED: {
          entry: [{ type: 'assign', params: { paymentStatus: 'failed' } }],
          on: {
            SELECT_PAYMENT_METHOD: 'INITIALIZING',
            CANCEL_SESSION: 'IDLE',
          },
        },
        CANCELLED: {
          entry: [{ type: 'assign', params: { paymentStatus: 'cancelled' } }],
          always: 'CHECKOUT_REVIEW',
        },
      },
      on: {
        CANCEL_SESSION: 'IDLE',
      },
      after: {
        120000: { // Таймаут оплаты 2 минуты
          target: '.FAILED',
          actions: ['setError'],
        },
      },
    },
    
    RECEIPT: {
      description: 'Печать чека и завершение транзакции.',
      entry: [{ type: 'assign', params: { paymentStatus: 'success' } }],
      on: {
        RECEIPT_PRINTED: 'COMPLETING',
        SEND_RECEIPTByEmail: 'RECEIPT',
        FINISH_TRANSACTION: 'COMPLETING',
      },
    },
    
    COMPLETING: {
      description: 'Завершение транзакции.',
      always: 'IDLE',
    },
    
    ERROR: {
      description: 'Общая ошибка оборудования.',
      entry: ['setError'],
      on: {
        ACKNOWLEDGE_ERROR: {
          guard: ({ context }) => context.retryCount < 3,
          target: 'SHOPPING',
          actions: ['clearError'],
        },
        CALL_OPERATOR: 'WAITING_OPERATOR_ERROR',
        CANCEL_SESSION: 'IDLE',
      },
    },
    
    WAITING_OPERATOR_ERROR: {
      description: 'Ожидание оператора для устранения ошибки.',
      on: {
        OPERATOR_ARRIVED: 'SHOPPING',
        CANCEL_SESSION: 'IDLE',
      },
    },
    
    MAINTENANCE: {
      description: 'Режим обслуживания (блокирует все операции).',
      on: {
        OPERATOR_ARRIVED: 'IDLE',
      },
    },
  },
});

// --- Тип для useActor хука ---
export type KioskMachine = typeof kioskMachine;
