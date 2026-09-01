# SCO Kiosk Terminal - Терминал Самообслуживания

Enterprise-решение для касс самообслуживания (КСО / SCO) с поддержкой offline-first режима.

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron App                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐           ┌─────────────────────────┐  │
│  │   Renderer Process  │◄──IPC──►  │    Main Process         │  │
│  │   (React + TS)      │           │   (Node.js)             │  │
│  │                     │           │                         │  │
│  │  - UI Components    │           │  - Hardware Bridge      │  │
│  │  - XState Machine   │           │  - HAL Manager          │  │
│  │  - Tailwind CSS     │           │  - SerialPort/USB       │  │
│  │  - Framer Motion    │           │  - Fiscal Printer       │  │
│  └─────────────────────┘           │  - POS Terminal         │  │
│                                    │  - SQLite DB            │  │
│                                    └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌──────────┐          ┌──────────┐
   │ Scanner │          │ POS Term │          │ ФР (АТОЛ)│
   │ (USB/COM)│          │ (TCP/COM)│          │ (COM/TCP)│
   └─────────┘          └──────────┘          └──────────┘
```

## Структура проекта

```
/workspace
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── main.js              # Точка входа Electron
│   │   ├── preload.js           # Preload скрипт (мост)
│   │   ├── hardware/            # Драйверы оборудования
│   │   │   └── FiscalPrinterDriver.ts
│   │   └── db/                  # Локальная БД (SQLite)
│   ├── renderer/                # React Frontend
│   │   ├── components/          # UI компоненты
│   │   │   └── CartView.tsx
│   │   ├── machine/             # XState машина состояний
│   │   │   └── kioskMachine.ts
│   │   ├── hooks/               # Custom React hooks
│   │   │   └── useTheme.ts
│   │   ├── types/               # TypeScript типы
│   │   ├── assets/              # Изображения, шрифты
│   │   ├── App.tsx              # Корневой компонент
│   │   ├── main.tsx             # Точка входа React
│   │   └── index.css            # Глобальные стили
│   └── shared/                  # Общие типы и интерфейсы
│       ├── types.ts             # Типы данных
│       └── hal.ts               # HAL интерфейсы
├── public/
│   └── theme.json               # Конфигурация брендирования
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## Технологический стек

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4
- **Desktop:** Electron 41
- **State Management:** XState 5 (машина состояний для UX flow)
- **Animations:** Framer Motion
- **Local DB:** better-sqlite3 (оффлайн-режим)
- **Hardware:** serialport (COM-порты), USB HID

## Установка и запуск

```bash
# Установка зависимостей
npm install

# Пересборка native модулей (если нужно)
npm run rebuild

# Запуск в режиме разработки
npm run dev

# Сборка production версии
npm run build
npm run build:electron
```

## Машина состояний (User Flow)

```
IDLE → LOYALTY → SHOPPING ↔ AGE_CHECK → CHECKOUT_REVIEW → PAYMENT → RECEIPT → IDLE
                              ↓              ↓               ↓
                           ERROR ← WAITING_OPERATOR ← CANCEL
```

## Брендирование

Приложение читает `theme.json` при старте и динамически применяет CSS-переменные:

```json
{
  "brandName": "Пятёрочка",
  "colors": {
    "primary": "#E30611",
    "secondary": "#FFFFFF",
    ...
  },
  "messages": {
    "welcome": "Добро пожаловать!",
    ...
  }
}
```

## HAL (Hardware Abstraction Layer)

Интерфейсы для оборудования:
- `IScanner` - сканер штрихкодов (USB HID / Serial)
- `IScale` - весы (Serial)
- `IPosTerminal` - банковский терминал (TCP / Serial)
- `IFiscalPrinter` - фискальный регистратор (АТОЛ / Штрих-М)

## Лицензия

ISC
