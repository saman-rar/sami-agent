import { SignIn } from '@/components/chat/web-chat-auth';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

const SingInPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) redirect('/');

  return <SignIn />;
};
export default SingInPage;
