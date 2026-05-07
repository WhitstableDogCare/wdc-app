'use client'

import { useState, useEffect, use } from 'react'
import DogForm from '@/components/DogForm'
import { PageHead, Btn } from '@/app/components/ui'

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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  )
  if (!dog) return (
    <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>Dog not found</div>
  )

  return (
    <div style={{ maxWidth: 680 }}>
      <PageHead title={`Edit ${String(dog.name || '')}`}>
        <Btn href={`/dogs/${id}`} variant="secondary">Back to profile</Btn>
      </PageHead>
      <DogForm mode="edit" dogId={parseInt(id)} initialData={dog as Parameters<typeof DogForm>[0]['initialData']} />
    </div>
  )
}
