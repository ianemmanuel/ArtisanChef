import { Button } from '@repo/ui/components/button'
import { Upload } from 'lucide-react'

interface ImageUploadCardProps {
  title: string
  description: string
  icon?: React.ReactNode
  onUploadClick: () => void
  className?: string
}

export function ImageUploadCard({
  title,
  description,
  icon = <Upload className="h-8 w-8 text-primary" />,
  onUploadClick,
  className = ''
}: ImageUploadCardProps) {
  return (
    <div className={`border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center bg-gradient-to-br from-primary/5 to-secondary/5 ${className}`}>
      <div className="mx-auto w-16 h-16 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={onUploadClick}
        >
          <Upload className="mr-2 h-4 w-4" />
          Choose File
        </Button>
      </div>
    </div>
  );
}