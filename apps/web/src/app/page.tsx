'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { user, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth().then(() => {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    })
  }, [user, router, checkAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
    </div>
  )
}
