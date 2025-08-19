import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';

export default async function Page() {
  const cookieStore = await cookies();
  // our authentication uses session_token cookie (JWT)
  const session = cookieStore.get('session_token');
  if (session) {
    // redirect server-side to avoid client flicker
    redirect('/home');
  }
  return <LoginForm />;
}
