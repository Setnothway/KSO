// ============================================
// ЭТАП 5: Работа с "Железом" - Драйвер Фискального Регистратора
// ============================================

import { SerialPort } from 'serialport';
import { BaseHardwareDevice, IFiscalPrinter, DeviceStatus, ReceiptItem, CustomerInfo } from '@shared/hal';
import { FiscalReceiptEvent } from '@shared/types';

/**
 * Реализация драйвера для Фискального Регистратора (ФР)
 * Поддерживает протоколы АТОЛ и Штрих-М (FFD 1.05/1.2)
 * 
 * Паттерн: Strategy (может быть расширен для разных производителей)
 */

export enum FiscalProtocol {
  ATOL = 'atol',
  SHTRIH = 'shtrih',
}

export interface FiscalPrinterConfig {
  protocol: FiscalProtocol;
  port: string; // COM-порт или TCP адрес
  baudRate?: number;
  ip?: string; // Для сетевого подключения
  portTcp?: number;
  passwordOperator?: string; // Пароль оператора (по умолчанию 1)
  passwordUser?: string; // Пароль пользователя (по умолчанию 30)
}

export class FiscalPrinterDriver extends BaseHardwareDevice implements IFiscalPrinter {
  private config: FiscalPrinterConfig;
  private serialPort?: SerialPort;
  private shiftState: 'open' | 'closed' | 'unknown' = 'unknown';
  private paperStatus: 'ok' | 'low' | 'empty' = 'ok';

  constructor(config: FiscalPrinterConfig) {
    super();
    this.config = config;
  }

  /**
   * Подключение к ФР
   */
  async connect(): Promise<void> {
    try {
      if (this.config.ip && this.config.portTcp) {
        // Сетевое подключение (TCP)
        await this.connectTcp(this.config.ip, this.config.portTcp);
      } else {
        // Последовательное подключение (COM)
        await this.connectSerial(this.config.port, this.config.baudRate || 115200);
      }
      
      this._isConnected = true;
      this.shiftState = await this.getShiftState();
      console.log('[FiscalPrinter] Connected successfully');
    } catch (error) {
      this._isConnected = false;
      console.error('[FiscalPrinter] Connection failed:', error);
      throw new Error(`Failed to connect to fiscal printer: ${error}`);
    }
  }

  private async connectSerial(port: string, baudRate: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.serialPort = new SerialPort({ path: port, baudRate });
      
      this.serialPort.on('open', () => resolve());
      this.serialPort.on('error', (err) => reject(err));
    });
  }

  private async connectTcp(ip: string, port: number): Promise<void> {
    // Эмуляция TCP подключения (для примера)
    // В реальности используется net.Socket
    console.log(`[FiscalPrinter] Connecting to ${ip}:${port}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Отключение от ФР
   */
  async disconnect(): Promise<void> {
    if (this.serialPort) {
      await new Promise<void>((resolve, reject) => {
        this.serialPort!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.serialPort = undefined;
    }
    this._isConnected = false;
    console.log('[FiscalPrinter] Disconnected');
  }

  /**
   * Проверка статуса устройства
   */
  getStatus(): DeviceStatus {
    return {
      isOnline: this._isConnected,
      lastCheck: new Date(),
      errorCode: this._isConnected ? undefined : 'NOT_CONNECTED',
      errorMessage: this._isConnected ? undefined : 'ФР не подключен',
    };
  }

  /**
   * Открытие смены
   */
  async openShift(): Promise<boolean> {
    await this.checkConnection();
    
    const command = this.buildOpenShiftCommand();
    const response = await this.sendCommand(command);
    
    if (response.success) {
      this.shiftState = 'open';
      console.log('[FiscalPrinter] Shift opened');
      return true;
    }
    
    throw new Error(`Failed to open shift: ${response.error}`);
  }

  /**
   * Закрытие смены
   */
  async closeShift(password: string): Promise<boolean> {
    await this.checkConnection();
    
    const command = this.buildCloseShiftCommand(password);
    const response = await this.sendCommand(command);
    
    if (response.success) {
      this.shiftState = 'closed';
      console.log('[FiscalPrinter] Shift closed');
      return true;
    }
    
    throw new Error(`Failed to close shift: ${response.error}`);
  }

  /**
   * Получение статуса смены
   */
  async getShiftState(): Promise<'open' | 'closed' | 'unknown'> {
    await this.checkConnection();
    
    const command = this.buildGetShiftStateCommand();
    const response = await this.sendCommand(command);
    
    if (response.success && response.data) {
      this.shiftState = response.data.shiftState;
      return this.shiftState;
    }
    
    return 'unknown';
  }

  /**
   * Регистрация продажи (печать чека)
   */
  async registerSale(
    items: ReceiptItem[],
    totalAmount: number,
    paymentType: 'cash' | 'electronic' | 'mixed',
    customer?: CustomerInfo
  ): Promise<FiscalReceiptEvent> {
    await this.checkConnection();

    try {
      // 1. Начало чека
      const startCommand = this.buildStartReceiptCommand('sell');
      await this.sendCommand(startCommand);

      // 2. Печать позиций
      for (const item of items) {
        const itemCommand = this.buildPrintItemCommand(item);
        await this.sendCommand(itemCommand);
      }

      // 3. Оплата
      const paymentCommand = this.buildPaymentCommand(totalAmount, paymentType);
      await this.sendCommand(paymentCommand);

      // 4. Завершение чека
      const finishCommand = this.buildFinishReceiptCommand(customer);
      const response = await this.sendCommand(finishCommand);

      if (response.success) {
        const receiptEvent: FiscalReceiptEvent = {
          status: 'success',
          receiptNumber: response.data?.receiptNumber,
          timestamp: new Date(),
        };
        
        console.log('[FiscalPrinter] Receipt printed:', receiptEvent.receiptNumber);
        return receiptEvent;
      }

      throw new Error(response.error);
    } catch (error) {
      const receiptEvent: FiscalReceiptEvent = {
        status: 'error',
        errorCode: 'PRINT_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
      
      console.error('[FiscalPrinter] Print failed:', receiptEvent);
      return receiptEvent;
    }
  }

  /**
   * Печать чека коррекции
   */
  async printCorrectionReceipt(amount: number, reason: string): Promise<FiscalReceiptEvent> {
    await this.checkConnection();
    
    // Эмуляция печати чека коррекции
    console.log(`[FiscalPrinter] Printing correction receipt: ${amount} kopecks, reason: ${reason}`);
    
    return {
      status: 'success',
      receiptNumber: `CORR_${Date.now()}`,
      timestamp: new Date(),
    };
  }

  /**
   * Печать произвольного текста
   */
  async printText(text: string): Promise<void> {
    await this.checkConnection();
    
    const command = this.buildPrintTextCommand(text);
    await this.sendCommand(command);
  }

  /**
   * Проверка наличия бумаги
   */
  async checkPaperStatus(): Promise<'ok' | 'low' | 'empty'> {
    await this.checkConnection();
    
    // Эмуляция проверки бумаги
    // В реальности отправляется команда статуса
    return this.paperStatus;
  }

  /**
   * Обработчики событий бумаги
   */
  onPaperLow(callback: () => void): void {
    this.on('paper_low', callback);
  }

  onPaperJam(callback: () => void): void {
    this.on('paper_jam', callback);
  }

  onCoverOpen(callback: () => void): void {
    this.on('cover_open', callback);
  }

  // ============================================
  // Приватные методы для работы с протоколами
  // ============================================

  private async checkConnection(): Promise<void> {
    if (!this._isConnected) {
      throw new Error('Fiscal printer is not connected');
    }
  }

  private buildOpenShiftCommand(): Buffer {
    // Команда открытия смены зависит от протокола
    if (this.config.protocol === FiscalProtocol.ATOL) {
      // АТОЛ: команда 0x8C (Открытие смены)
      return Buffer.from([0x8C, 0x00, 0x00]);
    } else {
      // Штрих-М: команда 0x8C
      return Buffer.from([0x8C, 0x01]);
    }
  }

  private buildCloseShiftCommand(password: string): Buffer {
    // Эмуляция команды закрытия смены
    const pass = parseInt(password) || 30;
    return Buffer.from([0x8D, pass]);
  }

  private buildGetShiftStateCommand(): Buffer {
    return Buffer.from([0x8E, 0x00]);
  }

  private buildStartReceiptCommand(type: 'sell' | 'return' | 'correction'): Buffer {
    // Начало чека продажи
    return Buffer.from([0x8A, type === 'sell' ? 0x00 : 0x01]);
  }

  private buildPrintItemCommand(item: ReceiptItem): Buffer {
    // Формирование команды печати позиции
    // Упрощенная эмуляция
    const nameBytes = Buffer.from(item.name, 'utf8').slice(0, 64);
    const priceBuffer = Buffer.alloc(4);
    priceBuffer.writeUInt32LE(item.price);
    
    return Buffer.concat([
      Buffer.from([0xA6]), // Команда печати строки
      Buffer.from([nameBytes.length]),
      nameBytes,
      priceBuffer,
      Buffer.from([item.quantity]),
      Buffer.from([item.taxRate]),
    ]);
  }

  private buildPaymentCommand(amount: number, type: 'cash' | 'electronic' | 'mixed'): Buffer {
    const paymentTypeByte = type === 'cash' ? 0x00 : type === 'electronic' ? 0x01 : 0x02;
    const amountBuffer = Buffer.alloc(4);
    amountBuffer.writeUInt32LE(amount);
    
    return Buffer.concat([
      Buffer.from([0xAA]), // Команда оплаты
      Buffer.from([paymentTypeByte]),
      amountBuffer,
    ]);
  }

  private buildFinishReceiptCommand(customer?: CustomerInfo): Buffer {
    // Завершение чека с опциональными данными клиента
    const hasCustomer = customer ? (customer.email || customer.phone) : false;
    return Buffer.from([0xAC, hasCustomer ? 0x01 : 0x00]);
  }

  private buildPrintTextCommand(text: string): Buffer {
    const textBytes = Buffer.from(text, 'utf8');
    return Buffer.concat([
      Buffer.from([0x9B, textBytes.length]),
      textBytes,
    ]);
  }

  private async sendCommand(command: Buffer): Promise<{ success: boolean; data?: any; error?: string }> {
    // Эмуляция отправки команды и получения ответа
    // В реальности здесь работа с SerialPort или net.Socket
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Эмуляция успешного ответа
        resolve({
          success: true,
          data: {
            receiptNumber: `${Date.now()}`,
            shiftState: 'open' as const,
          },
        });
      }, 50);
    });
  }
}

// ============================================
// Фабрика для создания ФР
// ============================================

export function createFiscalPrinter(config: FiscalPrinterConfig): IFiscalPrinter {
  return new FiscalPrinterDriver(config);
}
