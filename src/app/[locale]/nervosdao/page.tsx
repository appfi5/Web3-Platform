import { NervosDaoPage } from './NervosDaoPage';

type PageProps = {
  params: { locale: string; address: string };
  searchParams?: Record<string, string | undefined>;
};

export default async function NervosDAO({ searchParams }: PageProps) {
  return <NervosDaoPage initialTab={searchParams?.tab} />;
}
