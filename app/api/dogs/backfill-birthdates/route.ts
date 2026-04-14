export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Find all dogs that have an age but no birth_date
    const dogs = await prisma.dog.findMany({
      where: {
        age: { not: null },
        birth_date: null,
      },
      select: { id: true, age: true },
    })

    const today = new Date()
    let updated = 0

    for (const dog of dogs) {
      if (!dog.age) continue
      // Use Jan 1st of the approximate birth year as a reasonable fake date
      const birthYear = today.getFullYear() - Math.round(dog.age)
      const birth_date = `${birthYear}-01-01`
      await prisma.dog.update({
        where: { id: dog.id },
        data: { birth_date },
      })
      updated++
    }

    return NextResponse.json({ success: true, updated })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
