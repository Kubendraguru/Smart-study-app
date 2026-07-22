import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
          )}
          <input
            ref={ref}
            className={`w-full bg-gray-50 border rounded-xl py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${icon ? 'pl-11 pr-4' : 'px-4'} ${error ? 'border-red-400' : 'border-gray-200'} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
