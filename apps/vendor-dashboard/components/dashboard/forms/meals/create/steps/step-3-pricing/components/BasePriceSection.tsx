import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@repo/ui/components/form';
import { DollarSign } from 'lucide-react';
import { Input } from '@repo/ui/components/input';
import { usePricing, useUpdatePricing } from '@/lib/state/meal-store';
import { useState, useEffect } from 'react';

interface BasePriceSectionProps {
  control: any;
}

export function BasePriceSection({ control }: BasePriceSectionProps) {
  const pricing = usePricing();
  const updatePricing = useUpdatePricing();
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Sync display value with form value
  useEffect(() => {
    if (!isFocused) {
      const formValue = control._getWatch('basePrice');
      if (formValue === 0 || formValue === '' || formValue === null || formValue === undefined) {
        setDisplayValue('');
      } else {
        setDisplayValue(String(formValue));
      }
    }
  }, [control._getWatch('basePrice'), isFocused]);

  const handleBasePriceChange = (value: number) => {
    updatePricing({
      ...pricing,
      basePrice: value
    });
  };

  return (
    <div className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border">
      <FormField
        control={control}
        name="basePrice"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Base Price *
            </FormLabel>
            <FormControl>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-8 text-xl font-semibold transition-all duration-200 focus:scale-[1.02]"
                  value={displayValue}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    setDisplayValue(inputValue);
                    
                    if (inputValue === '' || inputValue === '.') {
                      field.onChange(0);
                      handleBasePriceChange(0);
                      return;
                    }
                    
                    const numericValue = parseFloat(inputValue);
                    if (!isNaN(numericValue)) {
                      field.onChange(numericValue);
                      handleBasePriceChange(numericValue);
                    }
                  }}
                  onFocus={() => {
                    setIsFocused(true);
                    if (field.value === 0) {
                      setDisplayValue('');
                    }
                  }}
                  onBlur={() => {
                    setIsFocused(false);
                    if (displayValue === '' || displayValue === '.') {
                      setDisplayValue('');
                      field.onChange(0);
                      handleBasePriceChange(0);
                    } else {
                      const numericValue = parseFloat(displayValue);
                      if (!isNaN(numericValue)) {
                        setDisplayValue(String(numericValue));
                      }
                    }
                  }}
                />
              </div>
            </FormControl>
            <FormDescription>
              This is the starting price for your meal. Variants will add to this base price.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}