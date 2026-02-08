interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 animate-fade-in-up pb-8 border-b border-border/50">
      <div className="space-y-2 flex-1">
        <h1 className="font-['Fraunces'] text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm sm:text-base max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
      
      {/* Decorative gradient accent */}
      <div 
        className="hidden sm:block absolute top-0 left-0 right-0 h-0.5 mt-16 opacity-30"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--color-terracotta-500) 30%, var(--color-honey-500) 70%, transparent 100%)'
        }}
      />
    </div>
  );
}