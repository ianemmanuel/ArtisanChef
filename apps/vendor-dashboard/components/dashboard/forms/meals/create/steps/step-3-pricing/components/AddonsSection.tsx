import { useFieldArray } from 'react-hook-form'
import { SectionHeader } from './SectionHeader'
import { AddonCard } from './AddonCard'
import { usePricing, useUpdatePricing } from '@/lib/state/meal-store'

interface AddonsSectionProps {
  control: any;
}

export function AddonsSection({ control }: AddonsSectionProps) {
  const pricing = usePricing()
  const updatePricing = useUpdatePricing()
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'addons',
  });

  const addAddon = () => {
    const newAddon = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      priceModifier: 0,
      stockLimit: undefined,
      maxPerOrder: undefined,
    }
    
    // Update form
    append(newAddon)
    
    // Update store
    updatePricing({
      ...pricing,
      addons: [...pricing.addons, newAddon]
    })
  };

  const handleRemoveAddon = (index: number) => {
    // Update form
    remove(index)
    
    // Update store
    const updatedAddons = pricing.addons.filter((_, i) => i !== index)
    updatePricing({
      ...pricing,
      addons: updatedAddons
    })
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Add-ons & Extras"
        description="Optional extras like cheese, wine, or special sauces"
        icon="🧀"
        buttonText="Add Extra"
        onButtonClick={addAddon}
      />

      <div className="space-y-4">
        {fields.map((field, index) => (
          <AddonCard
            key={field.id}
            control={control}
            index={index}
            onRemove={() => handleRemoveAddon(index)}
          />
        ))}
      </div>
    </div>
  );
}