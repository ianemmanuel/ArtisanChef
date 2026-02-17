import Image from 'next/image'
import { TrendingUp, Coffee, Shield } from 'lucide-react'

export default function AuthAside() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-linear-to-br from-espresso-900/95 via-espresso-900/90 to-espresso-800/95">
      <div className="absolute inset-0">
        <Image
          src="https://images.pexels.com/photos/28976215/pexels-photo-28976215.jpeg"
          alt="Artisan coffee shop interior"
          fill
          priority
          className="object-cover opacity-40"
          sizes="100vw"
          quality={90}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-linear-to-br from-espresso-900/60 via-espresso-800/50 to-espresso-900/70" />
      </div>

      {/* Decorative elements - subtle coffee beans pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-10 h-4 w-4 rounded-full bg-latte-100" />
        <div className="absolute top-1/3 right-20 h-3 w-3 rounded-full bg-latte-100" />
        <div className="absolute bottom-1/4 left-1/4 h-2 w-2 rounded-full bg-latte-100" />
        <div className="absolute bottom-1/3 right-1/3 h-3 w-3 rounded-full bg-latte-100" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md px-5 py-7">
        {/* Main heading */}
        <h1 className="text-3xl font-bold text-latte-50 mb-4 leading-tight">
          Welcome to your
          <span className="block text-caramel-300">command center</span>
        </h1>

        <p className="text-lg text-latte-200/90 leading-relaxed mb-10">
          Where quality meets efficiency. Manage your bakery operations with precision and care.
        </p>

        {/* Minimal features list */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-latte-50/10 backdrop-blur-sm">
              <TrendingUp className="h-5 w-5 text-caramel-300" />
            </div>
            <div>
              <h3 className="font-semibold text-latte-50">Real-time Analytics</h3>
              <p className="text-sm text-latte-200/80">Track sales and growth live</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-latte-50/10 backdrop-blur-sm">
              <svg className="h-5 w-5 text-caramel-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-latte-50">Order Management</h3>
              <p className="text-sm text-latte-200/80">Handle orders seamlessly</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-latte-50/10 backdrop-blur-sm">
              <Shield className="h-5 w-5 text-caramel-300" />
            </div>
            <div>
              <h3 className="font-semibold text-latte-50">Secure Platform</h3>
              <p className="text-sm text-latte-200/80">Your data is protected</p>
            </div>
          </div>
        </div>

        {/* Minimal stats at bottom */}
        <div className="mt-12 pt-8 border-t border-latte-100/10">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-caramel-300">100%</div>
              <div className="text-xs text-latte-200/70">Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-caramel-300">24/7</div>
              <div className="text-xs text-latte-200/70">Support</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}