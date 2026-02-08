"use client"
import { UserButton } from "@clerk/nextjs"
import { ListOrdered } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ProfileButton() {
    const router = useRouter()
  return (
    <UserButton>
        <UserButton.MenuItems>
            <UserButton.Action
                label="See orders"
                labelIcon={<ListOrdered className="w-4 h-4"/>}
                onClick={() => router.push("/orders")}    
            />
        </UserButton.MenuItems>
    </UserButton>
  )
}
