import { SignUp } from "@clerk/nextjs"
import Link from "next/link"

export default function Page() {
  return (
    <div className="w-full">
      <SignUp />
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link 
            href="/sign-in" 
            className="text-peach-600 dark:text-peach-400 hover:text-peach-700 dark:hover:text-peach-300 font-semibold transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}