import { useFieldArray } from 'react-hook-form';
import { Settings } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { VariantGroupCard } from './VaraintGroupCard'

interface VariantGroupsSectionProps {
  control: any;
  basePrice: number;
}

export function VariantGroupsSection({
  control,
  basePrice
}: VariantGroupsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  const addVariantGroup = () => {
    append({
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      options: [{
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        priceModifier: 0,
        isDefault: true,
      }]
    });
  };

  const removeVariantGroup = (index: number) => {
    remove(index);
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Variant Groups"
        description="Create variant categories like Size, Crust Type, etc. with multiple options"
        icon={<Settings className="h-5 w-5" />}
        buttonText="Add Variant Group"
        onButtonClick={addVariantGroup}
      />

      <div className="space-y-6">
        {fields.map((field, groupIndex) => (
          <VariantGroupCard
            key={field.id}
            control={control}
            groupIndex={groupIndex}
            basePrice={basePrice}
            onRemoveGroup={() => removeVariantGroup(groupIndex)}
          />
        ))}
      </div>
    </div>
  );
}