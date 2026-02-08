import { useFieldArray, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { Button } from '@repo/ui/components/button';
import { Trash2, Plus } from 'lucide-react';
import { VariantOptionRow } from './VariantOptionRow';

interface VariantGroupCardProps {
  control: any;
  groupIndex: number;
  basePrice: number;
  onRemoveGroup: () => void;
}

export function VariantGroupCard({
  control,
  groupIndex,
  basePrice,
  onRemoveGroup
}: VariantGroupCardProps) {
  // Use useFieldArray for proper nested field management
  const { fields: optionFields, append: appendOption, remove: removeOption, update: updateOption } = useFieldArray({
    control,
    name: `variants.${groupIndex}.options`,
  });

  // Watch the current values of the options to access their properties
  const watchedOptions = useWatch({
    control,
    name: `variants.${groupIndex}.options`,
    defaultValue: []
  });

  const addOption = () => {
    appendOption({
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      priceModifier: 0,
      isDefault: false,
    });
  };

  const handleRemoveOption = (optionIndex: number) => {
    const currentOptions = watchedOptions || [];
    const optionToRemove = currentOptions[optionIndex];
    
    // If removing the default option and there are other options, make the first remaining option default
    if (optionToRemove?.isDefault && currentOptions.length > 1) {
      const nextDefaultIndex = optionIndex === 0 ? 1 : 0;
      updateOption(nextDefaultIndex, {
        ...currentOptions[nextDefaultIndex],
        isDefault: true
      });
    }
    
    removeOption(optionIndex);
  };

  const handleSetDefaultOption = (optionIndex: number) => {
    const currentOptions = watchedOptions || [];
    // Update all options to set only the selected one as default
    currentOptions.forEach((option: any, index: number) => {
      updateOption(index, {
        ...option,
        isDefault: index === optionIndex
      });
    });
  };

  return (
    <div className="p-6 border rounded-lg bg-card space-y-4">
      <div className="flex items-center justify-between">
        <FormField
          control={control}
          name={`variants.${groupIndex}.name`}
          render={({ field }) => (
            <FormItem className="flex-1 mr-4">
              <FormLabel>Variant Group Name *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., Size, Crust Type, Temperature" 
                  {...field}
                  value={field.value || ''}
                  className="font-medium"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRemoveGroup}
          className="mt-6"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Options</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Option
          </Button>
        </div>

        {optionFields.map((option, optionIndex) => {
          const watchedOption = watchedOptions?.[optionIndex] || {};
          return (
            <VariantOptionRow
              key={option.id}
              control={control}
              groupIndex={groupIndex}
              optionIndex={optionIndex}
              basePrice={basePrice}
              onRemove={() => handleRemoveOption(optionIndex)}
              onSetDefault={() => handleSetDefaultOption(optionIndex)}
              isDefault={watchedOption.isDefault || false}
              priceModifier={watchedOption.priceModifier || 0}
            />
          );
        })}
      </div>
    </div>
  );
}