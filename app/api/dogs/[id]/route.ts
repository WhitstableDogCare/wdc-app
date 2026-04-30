import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    const dog = await prisma.dog.findUnique({
      where: { id },
      include: { owners: true, vets: true, buddies: true },
    })
    if (!dog) return NextResponse.json({ error: 'Dog not found' }, { status: 404 })
    return NextResponse.json(dog)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch dog' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    const body = await request.json()
    const { owners, vets, buddies, id: _id, created_at, updated_at, tally_submissions, ...dogData } = body

    // Update dog fields
    await prisma.dog.update({
      where: { id },
      data: dogData,
    })

    // Replace owners
    if (owners !== undefined) {
      await prisma.owner.deleteMany({ where: { dog_id: id } })
      if (owners.length > 0) {
        await prisma.owner.createMany({
          data: owners.map((o: Record<string, unknown>) => ({ ...o, dog_id: id, id: undefined })),
        })
      }
    }

    // Replace vets
    if (vets !== undefined) {
      await prisma.vet.deleteMany({ where: { dog_id: id } })
      if (vets.length > 0) {
        await prisma.vet.createMany({
          data: vets.map((v: Record<string, unknown>) => ({ ...v, dog_id: id, id: undefined })),
        })
      }
    }

    // Replace buddies
    if (buddies !== undefined) {
      await prisma.buddy.deleteMany({ where: { dog_id: id } })
      if (buddies.length > 0) {
        await prisma.buddy.createMany({
          data: buddies.map((b: Record<string, unknown>) => ({ ...b, dog_id: id, id: undefined })),
        })
      }
    }

    const updated = await prisma.dog.findUnique({
      where: { id },
      include: { owners: true, vets: true, buddies: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update dog' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    const body = await request.json()
    const dog = await prisma.dog.update({
      where: { id },
      data: {
        ...(body.archived !== undefined ? { archived: body.archived } : {}),
        ...(body.is_solo !== undefined  ? { is_solo: body.is_solo }   : {}),
      },
    })
    return NextResponse.json(dog)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update dog' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    await prisma.dog.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete dog' }, { status: 500 })
  }
}
