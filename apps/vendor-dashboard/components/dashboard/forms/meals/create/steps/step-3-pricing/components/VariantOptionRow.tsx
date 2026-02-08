import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input'
import { Switch } from '@repo/ui/components/switch'
import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import { Trash2 } from 'lucide-react'
import { PriceInput } from './PriceInput'
import { usePricing, useUpdatePricing } from '@/lib/state/meal-store';

interface VariantOptionRowProps {
  control: any;
  groupIndex: number;
  optionIndex: number;
  basePrice: number;
  onRemove: () => void;
  onSetDefault: () => void;
  isDefault: boolean;
  priceModifier: number;
}

export function VariantOptionRow({
  control,
  groupIndex,
  optionIndex,
  basePrice,
  onRemove,
  onSetDefault,
  isDefault,
  priceModifier
}: VariantOptionRowProps) {
  // Keep store functionality for dual state management
  const pricing = usePricing();
  const updatePricing = useUpdatePricing();

  // Simple calculation - no useMemo needed for basic arithmetic
  const totalPrice = (basePrice + (priceModifier || 0)).toFixed(2);

  // Keep store sync functionality
  const handlePriceModifierChange = (newValue: number) => {
    const updatedVariants = [...pricing.variants];
    if (updatedVariants[groupIndex] && updatedVariants[groupIndex].options[optionIndex]) {
      updatedVariants[groupIndex].options[optionIndex].priceModifier = newValue;
      updatePricing({ ...pricing, variants: updatedVariants });
    }
  };

  const handleNameChange = (newName: string) => {
    const updatedVariants = [...pricing.variants];
    if (updatedVariants[groupIndex] && updatedVariants[groupIndex].options[optionIndex]) {
      updatedVariants[groupIndex].options[optionIndex].name = newName;
      updatePricing({ ...pricing, variants: updatedVariants });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-3 bg-muted/30 rounded-md transition-all duration-200 hover:bg-muted/50">
      <FormField
        control={control}
        name={`variants.${groupIndex}.options.${optionIndex}.name`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Option Name *</FormLabel>
            <FormControl>
              <Input 
                placeholder="e.g., Small, Large" 
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e);
                  handleNameChange(e.target.value);
                }}
                className="text-sm transition-all duration-200 focus:scale-[1.02]"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`variants.${groupIndex}.options.${optionIndex}.priceModifier`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Price Modifier *</FormLabel>
            <FormControl>
              <PriceInput
                value={field.value ?? 0}
                onChange={(value) => {
                  field.onChange(value);
                  handlePriceModifierChange(value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormItem className="flex flex-col">
        <FormLabel className="text-xs">Default</FormLabel>
        <div className="flex items-center space-x-2">
          <Switch
            checked={isDefault}
            onCheckedChange={onSetDefault}
            className="transition-all duration-200"
          />
          {isDefault && (
            <Badge variant="default" className="text-xs animate-in fade-in duration-200">
              Default
            </Badge>
          )}
        </div>
      </FormItem>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Total: <span className="font-semibold text-foreground">
            ${totalPrice}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}