import React from 'react';
import { useTheme } from './hooks/useTheme';

// Заглушка для демонстрации структуры
const App: React.FC = () => {
  const { theme, isLoading } = useTheme();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-background">
        <div className="text-2xl text-brand-text">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-brand-background" style={{ 
      backgroundColor: 'var(--brand-background)',
      color: 'var(--brand-text)'
    }}>
      <header className="p-6 border-b border-gray-200 bg-brand-surface">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold" style={{ 
            color: 'var(--brand-primary)',
            fontFamily: 'var(--font-heading)'
          }}>
            {theme?.brandName || 'SCO Kiosk'}
          </h1>
          <img 
            src={theme?.logoUrl || ''} 
            alt="Logo" 
            className="h-16 w-auto"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      </header>
      
      <main className="p-8 h-[calc(100vh-100px)] overflow-hidden">
        <div className="grid grid-cols-2 gap-8 h-full">
          {/* Левая панель - информация */}
          <div className="bg-brand-surface rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center">
            <svg className="w-32 h-32 mb-6" style={{ color: 'var(--brand-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 12h.01M12 16h.01M12 8h.01M4.928 4.928l.707.707M19.071 19.071l-.707.707m0-14.142l.707.707M4.928 19.071l-.707.707" />
            </svg>
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              {theme?.messages.welcome || 'Добро пожаловать!'}
            </h2>
            <p className="text-xl text-brand-text-secondary text-center">
              {theme?.messages.scanBarcode || 'Отсканируйте штрихкод товара'}
            </p>
          </div>
          
          {/* Правая панель - корзина (заглушка) */}
          <div className="bg-brand-surface rounded-2xl shadow-xl p-6">
            <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Корзина
            </h3>
            <div className="flex-1 flex items-center justify-center text-brand-text-secondary">
              <p className="text-lg">Пусто</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
