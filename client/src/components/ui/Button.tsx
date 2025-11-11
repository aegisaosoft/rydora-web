import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'warning';
  size?: 'sm' | 'md' | 'lg';
};

const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
};
const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-600',
  secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-400',
  outline: 'border border-slate-300 hover:bg-slate-50 text-slate-900 focus:ring-slate-400',
  ghost: 'hover:bg-slate-100 text-slate-900 focus:ring-slate-400',
  destructive: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-600',
  warning: 'bg-yellow-500 text-slate-900 hover:bg-yellow-400 focus:ring-yellow-500',
};

export const Button: React.FC<ButtonProps> = ({ variant = 'default', size = 'md', className = '', ...props }) => {
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
  );
};

export default Button;


