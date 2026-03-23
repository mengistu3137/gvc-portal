import React from 'react';

export const Card = ({ children, title, actions }) => {
  return (
    <div className="bg-brand-surface rounded-xl shadow-panel overflow-hidden">
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          {title && <h3 className="text-lg font-bold text-brand-ink">{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};