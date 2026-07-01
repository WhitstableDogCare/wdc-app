export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const dogs = await prisma.dog.findMany({
    where: { archived: false },
    include: { vets: true, owners: true },
  })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear  = new Date(now.getFullYear(), 0, 1)
  const oneYearAgo   = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

  // ── Dog stats ──────────────────────────────────────────────────────────────
  const total = dogs.length
  const withPhoto    = dogs.filter(d => d.photo_path).length
  const withoutPhoto = total - withPhoto
  const withVet      = dogs.filter(d => d.vets.length > 0).length
  const noVet        = total - withVet

  const newThisMonth = dogs.filter(d => new Date(d.created_at) >= startOfMonth).length
  const newThisYear  = dogs.filter(d => new Date(d.created_at) >= startOfYear).length

  // Sex breakdown
  const sexMap: Record<string, number> = {}
  for (const d of dogs) {
    const key = d.sex ?? 'Unknown'
    sexMap[key] = (sexMap[key] ?? 0) + 1
  }

  // Neutered breakdown
  let neuteredCount = 0, intactCount = 0, unknownNeutered = 0
  for (const d of dogs) {
    if (d.neutered === true) neuteredCount++
    else if (d.neutered === false) intactCount++
    else unknownNeutered++
  }

  // Energy levels
  const energyMap: Record<string, number> = {}
  for (const d of dogs) {
    const key = d.energy_level ?? 'Unknown'
    energyMap[key] = (energyMap[key] ?? 0) + 1
  }

  // Breed breakdown (top 8)
  const breedMap: Record<string, number> = {}
  for (const d of dogs) {
    if (d.breed) {
      breedMap[d.breed] = (breedMap[d.breed] ?? 0) + 1
    }
  }
  const topBreeds = Object.entries(breedMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  // How did you hear about us (v2.0 referral tracking — only counts dogs with data)
  const heardAboutUsMap: Record<string, number> = {}
  for (const d of dogs) {
    if (d.heard_about_us) {
      heardAboutUsMap[d.heard_about_us] = (heardAboutUsMap[d.heard_about_us] ?? 0) + 1
    }
  }
  const heardAboutUsBreakdown = Object.entries(heardAboutUsMap)
    .sort((a, b) => b[1] - a[1])

  // Overdue vaccinations (date older than 1 year)
  const overdueVaccinations = dogs
    .filter(d => {
      if (!d.vaccination_date) return false
      return new Date(d.vaccination_date) < oneYearAgo
    })
    .map(d => ({ id: d.id, name: d.name, vaccination_date: d.vaccination_date }))

  // Missing vaccinations
  const missingVaccinations = dogs
    .filter(d => !d.vaccination_date)
    .map(d => ({ id: d.id, name: d.name }))

  return NextResponse.json({
    dogs: {
      total,
      withPhoto,
      withoutPhoto,
      withVet,
      noVet,
      newThisMonth,
      newThisYear,
      sexBreakdown: sexMap,
      neuteredCount,
      intactCount,
      unknownNeutered,
      energyBreakdown: energyMap,
      topBreeds,
      heardAboutUsBreakdown,
      overdueVaccinations,
      missingVaccinations,
    },
  })
}
