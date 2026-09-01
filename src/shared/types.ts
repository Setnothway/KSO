// ============================================
// ЭТАП 2: Интерфейсы и Типы (TypeScript)
// ============================================

// --- Товарная номенклатура ---

export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number; // Цена в копейках
  weight?: number; // Вес в граммах (для весовых товаров)
  pricePerKg?: number; // Цена за кг (для весовых товаров)
  category: string;
  imageUrl?: string;
  isAgeRestricted: boolean; // Требуется проверка возраста (алкоголь, табак)
  isMarked?: boolean; // Требует маркировки (Честный ЗНАК)
  exciseGroup?: 'alcohol' | 'tobacco' | 'none'; // Акцизная группа
  discount?: Discount;
}

export interface Discount {
  id: string;
  name: string;
  type: 'percent' | 'fixed';
  value: number; // Процент или фиксированная сумма в копейках
  validFrom: string;
  validTo: string;
}

// --- Корзина ---

export interface CartItem {
  product: Product;
  quantity: number;
  totalPrice: number; // Итоговая цена за позицию с учетом скидок
  scannedAt: Date;
}

export interface Cart {
  items: CartItem[];
  subtotal: number; // Сумма до скидок
  totalDiscount: number; // Общая сумма скидок
  total: number; // Итоговая сумма к оплате
  appliedPromotions: Promotion[];
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  discountAmount: number;
}

// --- Транзакция ---

export interface Transaction {
  id: string;
  sessionId: string;
  cart: Cart;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fiscalReceipt?: FiscalReceipt;
  loyaltyCardNumber?: string;
  startedAt: Date;
  completedAt?: Date;
  status: TransactionStatus;
}

export type PaymentMethod = 'card' | 'sbp' | 'cash' | 'mixed';
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
export type TransactionStatus = 'in_progress' | 'completed' | 'cancelled' | 'error';

export interface FiscalReceipt {
  receiptNumber: string;
  fiscalSign: string;
  fiscalDocumentNumber: number;
  shiftNumber: number;
  printedAt: Date;
  qrCodeUrl?: string;
}

// --- Конфигурация темы (брендирование) ---

export interface ThemeConfig {
  brandName: string;
  logoUrl: string;
  colors: {
    primary: string; // Основной цвет бренда
    secondary: string; // Вторичный цвет
    accent: string; // Акцентный цвет (кнопки, важные элементы)
    background: string; // Цвет фона
    surface: string; // Цвет поверхностей (карточки, панели)
    text: string; // Основной текст
    textSecondary: string; // Вторичный текст
    success: string; // Цвет успеха (зеленый)
    error: string; // Цвет ошибки (красный)
    warning: string; // Цвет предупреждения (желтый)
  };
  fonts: {
    primary: string;
    heading: string;
  };
  messages: {
    welcome: string;
    scanBarcode: string;
    insertCard: string;
    paymentSuccess: string;
    paymentFailed: string;
    callOperator: string;
  };
  backgroundImage?: string;
  language: 'ru' | 'en' | 'uz' | 'tg';
}

// --- Статистика и метрики ---

export interface SessionMetrics {
  sessionId: string;
  startedAt: Date;
  endedAt?: Date;
  duration: number; // в секундах
  statesVisited: string[];
  scanCount: number;
  errorCount: number;
  paymentDuration?: number; // Время от начала оплаты до успеха
  operatorCalls: number;
  hardwareErrors: HardwareErrorEvent[];
}

export interface HardwareErrorEvent {
  device: 'scanner' | 'pos' | 'fiscal' | 'scale' | 'printer';
  errorCode: string;
  message: string;
  timestamp: Date;
}

// --- События от оборудования ---

export interface ScanEvent {
  barcode: string;
  timestamp: Date;
  source: 'scanner' | 'keyboard';
}

export interface WeightEvent {
  weight: number; // в граммах
  stable: boolean;
  timestamp: Date;
}

export interface PosPaymentEvent {
  status: 'approved' | 'declined' | 'cancelled' | 'timeout';
  transactionId?: string;
  amount?: number;
  timestamp: Date;
}

export interface FiscalReceiptEvent {
  status: 'success' | 'error';
  receiptNumber?: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
}
