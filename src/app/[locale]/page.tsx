import { redirect } from '~/i18n/navigation';

type Props = {
  params: { locale: string };
};
// This page only renders when the app is built statically (output: 'export')
export default function RootPage({ params: { locale } }: Props) {
  redirect({ href: '/home', locale });
}
