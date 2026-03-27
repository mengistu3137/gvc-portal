import React from 'react';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyles = "px-4 py-2 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-95";
  
  const variants = {
    primary: "bg-brand-blue text-white hover:bg-blue-800 focus:ring-brand-blue",
    secondary: "bg-brand-yellow text-brand-blue hover:bg-yellow-400 focus:ring-brand-yellow",
    outline: "border-2 border-brand-blue/20 text-brand-blue hover:bg-brand-blue hover:text-white focus:ring-brand-blue",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
    destructive: "bg-rose-500 text-white hover:bg-rose-600 focus:ring-rose-500",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};