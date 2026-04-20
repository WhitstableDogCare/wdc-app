export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const dogSelect = { select: { id: true, name: true, breed: true } }

// GET /api/dogs/[id]/conflicts — list all conflicting dogs for this dog
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const dogId = parseInt(id)

  const [asdog1, asdog2] = await Promise.all([
    prisma.dogConflict.findMany({ where: { dog_id_1: dogId }, include: { dog2: dogSelect } }),
    prisma.dogConflict.findMany({ where: { dog_id_2: dogId }, include: { dog1: dogSelect } }),
  ])

  const conflicts = [
    ...asdog1.map(c => ({ id: c.id, dog: c.dog2, notes: c.notes })),
    ...asdog2.map(c => ({ id: c.id, dog: c.dog1, notes: c.notes })),
  ].sort((a, b) => a.dog.name.localeCompare(b.dog.name))

  return NextResponse.json(conflicts)
}

// POST /api/dogs/[id]/conflicts — add a conflict { otherDogId, notes }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const dogId = parseInt(id)
  const { otherDogId, notes } = await req.json()

  // Always store smaller id as dog_id_1 to satisfy the unique constraint
  const [dog_id_1, dog_id_2] = dogId < otherDogId ? [dogId, otherDogId] : [otherDogId, dogId]

  const conflict = await prisma.dogConflict.create({
    data: { dog_id_1, dog_id_2, notes: notes || null },
    include: { dog1: dogSelect, dog2: dogSelect },
  })

  const otherDog = conflict.dog_id_1 === dogId ? conflict.dog2 : conflict.dog1
  return NextResponse.json({ id: conflict.id, dog: otherDog, notes: conflict.notes })
}

// DELETE /api/dogs/[id]/conflicts — remove a conflict { otherDogId }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const dogId = parseInt(id)
  const { otherDogId } = await req.json()

  const [dog_id_1, dog_id_2] = dogId < otherDogId ? [dogId, otherDogId] : [otherDogId, dogId]

  await prisma.dogConflict.delete({
    where: { dog_id_1_dog_id_2: { dog_id_1, dog_id_2 } },
  })

  return NextResponse.json({ ok: true })
}
