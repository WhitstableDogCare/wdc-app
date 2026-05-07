import Link from 'next/link'
import DogForm from '@/components/DogForm'
import { PageHead, Btn } from '@/app/components/ui'

export default function NewDogPage() {
  return (
    <div style={{ maxWidth: 680 }}>
      <PageHead title="Add Dog">
        <Btn href="/" variant="secondary">Back to dogs</Btn>
      </PageHead>
      <DogForm mode="create" />
    </div>
  )
}
