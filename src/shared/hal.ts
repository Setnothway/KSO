// ============================================
// ЭТАП 2 (продолжение): Hardware Abstraction Layer (HAL)
// ============================================

import { ScanEvent, WeightEvent, PosPaymentEvent, FiscalReceiptEvent } from './types';

/**
 * Интерфейс для всех устройств. 
 * Следует принципу Dependency Inversion (SOLID-D).
 */
export interface IHardwareDevice {
  isConnected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): DeviceStatus;
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
}

export interface DeviceStatus {
  isOnline: boolean;
  lastCheck: Date;
  errorCode?: string;
  errorMessage?: string;
}

// ============================================
// Сканер штрихкодов
// ============================================

export interface IScanner extends IHardwareDevice {
  // Режимы работы
  mode: 'hid' | 'serial' | 'virtual';
  
  // Настройки
  setMode(mode: 'hid' | 'serial'): Promise<void>;
  enableLaser(enable: boolean): Promise<void>;
  
  // События
  onScan(callback: (event: ScanEvent) => void): void;
  onError(callback: (error: Error) => void): void;
}

// ============================================
// Весы
// ============================================

export interface IScale extends IHardwareDevice {
  // Чтение текущего веса
  getWeight(): Promise<number>; // Возвращает вес в граммах
  
  // Калибровка
  calibrate(weight: number): Promise<boolean>;
  
  // События
  onWeightChange(callback: (event: WeightEvent) => void): void;
  onStable(callback: (weight: number) => void): void;
  onOverload(callback: () => void): void;
}

// ============================================
// POS-терминал (банковский эквайринг)
// ============================================

export interface IPaymentResult {
  success: boolean;
  transactionId?: string;
  amount?: number;
  authorizationCode?: string;
  errorMessage?: string;
}

export interface IPosTerminal extends IHardwareDevice {
  // Инициализация платежа
  initPayment(amount: number, currency?: string): Promise<IPaymentResult>;
  
  // Отмена последнего платежа
  cancelPayment(transactionId: string): Promise<boolean>;
  
  // Проверка статуса транзакции
  getStatus(transactionId: string): Promise<'pending' | 'approved' | 'declined'>;
  
  // Печать слип-чека (если требуется)
  printSlip(transactionId: string): Promise<boolean>;
  
  // События
  onPaymentComplete(callback: (event: PosPaymentEvent) => void): void;
  onConnectionLost(callback: () => void): void;
}

// ============================================
// Фискальный регистратор (ФР)
// ============================================

export interface ReceiptItem {
  name: string;
  price: number; // в копейках
  quantity: number;
  taxRate: number; // Ставка НДС (0, 10, 20)
  paymentMethod: 'full_prepayment' | 'prepayment' | 'advance' | 'full_payment' | 'partial_payment' | 'credit' | 'credit_payment';
  paymentObject: 'commodity' | 'excise' | 'job' | 'service' | 'gambling_bet' | 'gambling_prize' | 'lottery' | 'lottery_prize' | 'intellectual_activity' | 'payment' | 'agent_commission' | 'property_right' | 'non_operating_gain' | 'insurance_premium' | 'sales_tax' | 'resort_fee' | 'composite' | 'another' | 'property' | 'goods' | 'digital_currency';
}

export interface CustomerInfo {
  email?: string;
  phone?: string;
}

export interface IFiscalPrinter extends IHardwareDevice {
  // Работа со сменой
  openShift(): Promise<boolean>;
  closeShift(password: string): Promise<boolean>;
  getShiftState(): Promise<'open' | 'closed' | 'unknown'>;
  
  // Регистрация продажи
  registerSale(
    items: ReceiptItem[],
    totalAmount: number,
    paymentType: 'cash' | 'electronic' | 'mixed',
    customer?: CustomerInfo
  ): Promise<FiscalReceiptEvent>;
  
  // Печать чека коррекции
  printCorrectionReceipt(amount: number, reason: string): Promise<FiscalReceiptEvent>;
  
  // Печать произвольного текста (для отладки)
  printText(text: string): Promise<void>;
  
  // Проверка наличия бумаги
  checkPaperStatus(): Promise<'ok' | 'low' | 'empty'>;
  
  // События
  onPaperLow(callback: () => void): void;
  onPaperJam(callback: () => void): void;
  onCoverOpen(callback: () => void): void;
}

// ============================================
// Дисплей покупателя (опционально)
// ============================================

export interface ICustomerDisplay extends IHardwareDevice {
  showMessage(line1: string, line2?: string): Promise<void>;
  showPrice(amount: number, currency?: string): Promise<void>;
  clear(): Promise<void>;
  setBrightness(level: number): Promise<void>; // 0-100
}

// ============================================
// HAL Manager - Фабрика устройств
// ============================================

export type DeviceType = 'scanner' | 'scale' | 'pos' | 'fiscal' | 'display';

export interface HalConfig {
  scanner: {
    type: 'usb_hid' | 'serial' | 'mock';
    port?: string;
    baudRate?: number;
  };
  scale: {
    type: 'serial' | 'mock';
    port?: string;
    baudRate?: number;
  };
  pos: {
    type: 'tcp' | 'serial' | 'mock';
    host?: string;
    port?: number;
  };
  fiscal: {
    type: 'atol' | 'shtrih' | 'mock';
    port?: string;
    baudRate?: number;
    ip?: string;
    port_tcp?: number;
  };
  display: {
    type: 'serial' | 'lcd' | 'mock';
    port?: string;
  };
}

export interface IHalManager {
  initialize(config: HalConfig): Promise<void>;
  getDevice<T extends IHardwareDevice>(type: DeviceType): T | null;
  getAllDevicesStatus(): Record<DeviceType, DeviceStatus>;
  shutdown(): Promise<void>;
}

// ============================================
// Базовый класс для устройств (шаблонный метод)
// ============================================

export abstract class BaseHardwareDevice implements IHardwareDevice {
  protected _isConnected: boolean = false;
  protected _eventListeners: Map<string, Set<Function>> = new Map();
  
  get isConnected(): boolean {
    return this._isConnected;
  }
  
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getStatus(): DeviceStatus;
  
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event)!.add(callback);
  }
  
  off(event: string, callback: (...args: any[]) => void): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }
  
  protected emit(event: string, ...args: any[]): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      listeners.forEach(cb => cb(...args));
    }
  }
}
