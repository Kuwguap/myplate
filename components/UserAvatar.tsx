import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User } from "lucide-react"

interface UserAvatarProps {
  className?: string
}

export function UserAvatar({ className }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-muted">
        <User className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
  )
} 