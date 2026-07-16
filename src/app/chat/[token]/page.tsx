import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/Chat/LoadingScreen';

// Lazy load ChatScreen - nó nặng vì có nhiều component + hooks
const ChatScreen = dynamic(() => import('@/components/Chat/ChatScreen'), {
  loading: () => <LoadingScreen />,
  ssr: false, // Socket.IO chỉ chạy trên client
});

export default function ChatRoomPage({ params }: { params: { token: string } }) {
  return <ChatScreen inviteToken={params.token} />;
}
