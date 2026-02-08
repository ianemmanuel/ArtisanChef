import { SignIn } from "@clerk/nextjs"
import Link from "next/link"

export default function Page() {
  return (
    <div className="w-full">
      <SignIn />
      
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link 
            href="/sign-up" 
            className="text-peach-600 dark:text-peach-400 hover:text-peach-700 dark:hover:text-peach-300 font-semibold transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}