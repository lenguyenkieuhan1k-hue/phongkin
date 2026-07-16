import { redirect } from 'next/navigation';

export default function ResolveRoomPage({ params }: { params: { token: string } }) {
  redirect(`/chat/${params.token}`);
}
