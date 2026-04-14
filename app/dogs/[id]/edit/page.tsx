'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import DogForm from '@/components/DogForm'

export default function EditDogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [dog, setDog] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/dogs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const transformed: Record<string, unknown> = { ...data }
        if (data.owners?.[0]) {
          transformed.owner = {
            name: data.owners[0].name || '',
            phone: data.owners[0].phone || '',
            emergency_phone: data.owners[0].emergency_phone || '',
            address: data.owners[0].address || '',
            email: data.owners[0].email || '',
          }
        }
        if (data.vets?.[0]) {
          transformed.vet = {
            name: data.vets[0].name || '',
            phone: data.vets[0].phone || '',
            emergency_phone: data.vets[0].emergency_phone || '',
            address: data.vets[0].address || '',
            email: data.vets[0].email || '',
          }
        }
        const primaryBuddy = data.buddies?.find((b: { is_primary: boolean }) => b.is_primary) || data.buddies?.[0]
        const secondaryBuddy = data.buddies?.find(
          (b: { id: number; is_primary: boolean }) => b.id !== primaryBuddy?.id && !b.is_primary
        )
        if (primaryBuddy) {
          transformed.buddy1 = {
            name: primaryBuddy.name || '',
            phone: primaryBuddy.phone || '',
            emergency_phone: primaryBuddy.emergency_phone || '',
            address: primaryBuddy.address || '',
            email: primaryBuddy.email || '',
            is_primary: true,
          }
        }
        if (secondaryBuddy) {
          transformed.buddy2 = {
            name: secondaryBuddy.name || '',
            phone: secondaryBuddy.phone || '',
            emergency_phone: secondaryBuddy.emergency_phone || '',
            address: secondaryBuddy.address || '',
            email: secondaryBuddy.email || '',
            is_primary: false,
          }
        }
        setDog(transformed)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-16 text-gray-500">Loading...</div>
  if (!dog) return <div className="text-center py-16 text-gray-500">Dog not found</div>

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/dogs/${id}`} className="text-sm text-[#2d6a4f] hover:underline flex items-center gap-1 mb-4">
        ← Back to profile
      </Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit {String(dog.name || '')}</h1>
      <DogForm mode="edit" dogId={parseInt(id)} initialData={dog as Parameters<typeof DogForm>[0]['initialData']} />
    </div>
  )
}
