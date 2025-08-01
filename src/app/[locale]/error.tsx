'use client'; // Error boundaries must be Client Components

import Image from 'next/image';

import { Card } from '~/components/Card';

export default function Error() {
  return (
    <Card className="h-full flex justify-center items-center flex-col">
      <Image alt="icon" height={112} src="/img/error.svg" width={112} />
      <div>Opps! Some errors were encountered</div>
    </Card>
  );
}
