import { ReactNode } from 'react';

import {
  Footer as FooterType,
  Header as HeaderType,
} from '@/shared/types/blocks/landing';
import { Footer, Header } from '@/themes/default/blocks';

export default async function LandingLayout({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header: HeaderType;
  footer: FooterType;
}) {
  return (
    <div className="min-h-screen w-screen flex flex-col">
      <Header header={header} />
      <div className="flex-1">
        {children}
      </div>
      <Footer footer={footer} />
    </div>
  );
}
