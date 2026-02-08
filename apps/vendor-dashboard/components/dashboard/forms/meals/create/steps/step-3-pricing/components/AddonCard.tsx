import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { Button } from '@repo/ui/components/button';
import { Trash2 } from 'lucide-react';
import { PriceInput } from './PriceInput';
import { usePricing, useUpdatePricing } from '@/lib/state/meal-store';
import { useState, useEffect } from 'react';

interface AddonCardProps {
  control: any;
  index: number;
  onRemove: () => void;
}

export function AddonCard({
  control,
  index,
  onRemove
}: AddonCardProps) {
  const pricing = usePricing();
  const updatePricing = useUpdatePricing();
  
  // Local state for number inputs
  const [stockLimitDisplay, setStockLimitDisplay] = useState<string>('');
  const [maxPerOrderDisplay, setMaxPerOrderDisplay] = useState<string>('');
  const [isFocusedStock, setIsFocusedStock] = useState(false);
  const [isFocusedMax, setIsFocusedMax] = useState(false);

  // Sync display values with form values
  useEffect(() => {
    if (!isFocusedStock) {
      const stockValue = control._getWatch(`addons.${index}.stockLimit`);
      setStockLimitDisplay(stockValue ? String(stockValue) : '');
    }
  }, [control._getWatch(`addons.${index}.stockLimit`), isFocusedStock, index]);

  useEffect(() => {
    if (!isFocusedMax) {
      const maxValue = control._getWatch(`addons.${index}.maxPerOrder`);
      setMaxPerOrderDisplay(maxValue ? String(maxValue) : '');
    }
  }, [control._getWatch(`addons.${index}.maxPerOrder`), isFocusedMax, index]);

  // Handle addon field changes and update store
  const handleAddonChange = (field: keyof typeof pricing.addons[0], value: any) => {
    const updatedAddons = [...pricing.addons];
    if (updatedAddons[index]) {
      updatedAddons[index] = {
        ...updatedAddons[index],
        [field]: value
      };
      updatePricing({ ...pricing, addons: updatedAddons });
    }
  };

  const handleNumberInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: any,
    fieldName: keyof typeof pricing.addons[0],
    setDisplay: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const inputValue = e.target.value;
    setDisplay(inputValue);

    if (inputValue === '' || inputValue === '.') {
      field.onChange(undefined);
      handleAddonChange(fieldName, undefined);
      return;
    }

    const numericValue = parseInt(inputValue);
    if (!isNaN(numericValue) && numericValue > 0) {
      field.onChange(numericValue);
      handleAddonChange(fieldName, numericValue);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <FormField
          control={control}
          name={`addons.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Add-on Name *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., Extra Cheese" 
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    handleAddonChange('name', e.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`addons.${index}.priceModifier`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price *</FormLabel>
              <FormControl>
                <PriceInput
                  value={field.value || 0}
                  onChange={(value) => {
                    field.onChange(value);
                    handleAddonChange('priceModifier', value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`addons.${index}.stockLimit`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Limit</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  min="1"
                  placeholder="∞"
                  value={stockLimitDisplay}
                  onChange={(e) => handleNumberInput(e, field, 'stockLimit', setStockLimitDisplay)}
                  onFocus={() => setIsFocusedStock(true)}
                  onBlur={() => {
                    setIsFocusedStock(false);
                    if (stockLimitDisplay === '' || stockLimitDisplay === '.') {
                      setStockLimitDisplay('');
                      field.onChange(undefined);
                      handleAddonChange('stockLimit', undefined);
                    }
                  }}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Total available
              </FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`addons.${index}.maxPerOrder`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max per Order</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  min="1"
                  placeholder="∞"
                  value={maxPerOrderDisplay}
                  onChange={(e) => handleNumberInput(e, field, 'maxPerOrder', setMaxPerOrderDisplay)}
                  onFocus={() => setIsFocusedMax(true)}
                  onBlur={() => {
                    setIsFocusedMax(false);
                    if (maxPerOrderDisplay === '' || maxPerOrderDisplay === '.') {
                      setMaxPerOrderDisplay('');
                      field.onChange(undefined);
                      handleAddonChange('maxPerOrder', undefined);
                    }
                  }}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Per customer
              </FormDescription>
            </FormItem>
          )}
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}