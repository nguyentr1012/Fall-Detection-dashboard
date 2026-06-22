import { redirect } from 'next/navigation'

export default async function DevicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/device/${id}/history`)
}
