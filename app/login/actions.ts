'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { readConfig } from '@/lib/config'

export async function login(formData: FormData) {
  const password = formData.get('password') as string
  const config = readConfig()

  if (config.appPassword && password === config.appPassword) {
    const cookieStore = await cookies()
    cookieStore.set('wdc-session', process.env.SESSION_SECRET!, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    redirect('/')
  }

  redirect('/login?error=1')
}
