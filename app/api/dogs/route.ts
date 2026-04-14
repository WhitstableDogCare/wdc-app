import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true'
    const dogs = await prisma.dog.findMany({
      where: includeArchived ? {} : { archived: false },
      include: {
        owners: true,
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(dogs)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch dogs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { owners, vets, buddies, ...dogData } = body

    const dog = await prisma.dog.create({
      data: {
        ...dogData,
        owners: owners && owners.length > 0 ? { create: owners } : undefined,
        vets: vets && vets.length > 0 ? { create: vets } : undefined,
        buddies: buddies && buddies.length > 0 ? { create: buddies } : undefined,
      },
      include: { owners: true, vets: true, buddies: true },
    })
    return NextResponse.json(dog, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create dog' }, { status: 500 })
  }
}
