import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageHead, Btn, Pill } from './components/ui'
import DogList from './components/DogList'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [dogs, bookings] = await Promise.all([
    prisma.dog.findMany({
      where: { archived: false },
      include: { owners: true },
      orderBy: { name: 'asc' },
    }),
    prisma.dog.findMany({
      where: { archived: true },
      include: { owners: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div>
      <PageHead title="Dog Profiles" sub={`${dogs.length} active dog${dogs.length !== 1 ? 's' : ''}`}>
        <Btn href="/dogs/new" variant="primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Dog
        </Btn>
      </PageHead>

      <DogList dogs={dogs} archivedDogs={bookings} />
    </div>
  )
}
