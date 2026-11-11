import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button, EmptyState, Panel } from '@/components/ui'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <Panel className="mx-auto mt-10 max-w-lg">
      <EmptyState
        icon={Compass}
        title="This page does not exist"
        description="The address may be mistyped, or the feature is switched off in this workspace."
        action={<Button onClick={() => navigate('/')}>Go to the start page</Button>}
      />
    </Panel>
  )
}
