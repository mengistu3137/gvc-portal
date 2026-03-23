import React from 'react';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyles = "px-4 py-2 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
  
  const variants = {
    primary: "bg-brand-blue text-white hover:bg-blue-800 focus:ring-brand-blue",
    secondary: "bg-brand-yellow text-brand-blue hover:bg-yellow-400 focus:ring-brand-yellow",
    outline: "border border-brand-blue text-brand-blue hover:bg-brand-blue/10",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};