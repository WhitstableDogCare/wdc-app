import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE all dogs named "Unknown" and unlink their TallySubmissions
export async function DELETE() {
  try {
    const unknownDogs = await prisma.dog.findMany({ where: { name: 'Unknown' } })
    const ids = unknownDogs.map((d) => d.id)

    if (ids.length === 0) {
      return NextResponse.json({ deleted: 0 })
    }

    // Unlink submissions
    await prisma.tallySubmission.updateMany({
      where: { dog_id: { in: ids } },
      data: { dog_id: null },
    })

    // Delete related records
    await prisma.owner.deleteMany({ where: { dog_id: { in: ids } } })
    await prisma.vet.deleteMany({ where: { dog_id: { in: ids } } })
    await prisma.buddy.deleteMany({ where: { dog_id: { in: ids } } })

    const result = await prisma.dog.deleteMany({ where: { id: { in: ids } } })

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
