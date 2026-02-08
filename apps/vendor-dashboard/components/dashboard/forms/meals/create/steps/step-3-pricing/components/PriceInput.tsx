import { Input } from '@repo/ui/components/input';
import { useState, useEffect } from 'react';

interface PriceInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  prefix?: string;
}

export function PriceInput({
  value,
  onChange,
  placeholder = '0.00',
  className = '',
  prefix = '+$'
}: PriceInputProps) {
  // Use local state for display value to handle UX properly
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Update display value when external value changes (but not when focused)
  useEffect(() => {
    if (!isFocused) {
      if (value === 0 || value === '' || value === null || value === undefined) {
        setDisplayValue('');
      } else {
        setDisplayValue(String(value));
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Allow empty string or just decimal point
    if (inputValue === '' || inputValue === '.') {
      onChange(0);
      return;
    }
    
    // Parse the float value
    const numericValue = parseFloat(inputValue);
    
    // Only call onChange if it's a valid number, otherwise keep the display value
    if (!isNaN(numericValue)) {
      onChange(numericValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // If the current value is 0, clear the display for better UX
    if (value === 0) {
      setDisplayValue('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // If empty on blur, ensure we show empty and store 0
    if (displayValue === '' || displayValue === '.') {
      setDisplayValue('');
      onChange(0);
    } else {
      // Ensure the display matches the stored value
      const numericValue = parseFloat(displayValue);
      if (!isNaN(numericValue)) {
        setDisplayValue(String(numericValue));
      }
    }
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
          {prefix}
        </span>
      )}
      <Input
        type="number"
        step="0.01"
        min="0"
        placeholder={placeholder}
        className={`pl-8 ${className}`}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  );
}