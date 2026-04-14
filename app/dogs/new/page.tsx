import Link from 'next/link'
import DogForm from '@/components/DogForm'

export default function NewDogPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-[#2d6a4f] hover:underline flex items-center gap-1 mb-4">
        ← Back to all dogs
      </Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New Dog</h1>
      <DogForm mode="create" />
    </div>
  )
}
