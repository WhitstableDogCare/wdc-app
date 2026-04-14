import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile } from 'fs/promises'
import path from 'path'
import fs from 'fs'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    const formData = await request.formData()
    const file = formData.get('photo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${id}-${Date.now()}.${ext}`
    const photosDir = path.join(process.cwd(), 'public', 'photos')

    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true })
    }

    const filepath = path.join(photosDir, filename)
    await writeFile(filepath, buffer)

    // Remove old photo if exists
    const dog = await prisma.dog.findUnique({ where: { id }, select: { photo_path: true } })
    if (dog?.photo_path) {
      const oldFile = path.join(process.cwd(), 'public', dog.photo_path)
      if (fs.existsSync(oldFile)) {
        fs.unlinkSync(oldFile)
      }
    }

    const photo_path = `/photos/${filename}`
    await prisma.dog.update({ where: { id }, data: { photo_path } })

    return NextResponse.json({ photo_path })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
  }
}
