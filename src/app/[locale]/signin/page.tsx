import dynamic from 'next/dynamic';

const SignInFrom = dynamic(() => import('./SignInFrom'), { ssr: false });

export default function SignInPage() {
  return (
    <div className="grid w-full grow items-center px-4 sm:justify-center pt-10">
      <SignInFrom />
    </div>
  );
}
