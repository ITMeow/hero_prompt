import { getThemeBlock } from '@/core/theme';
import type { DynamicPage as DynamicPageType } from '@/shared/types/blocks/landing';
import {
  CTA,
  FAQ,
  Features,
  FeaturesAccordion,
  FeaturesFlow,
  FeaturesList,
  FeaturesMedia,
  FeaturesStep,
  Hero,
  Logos,
  Showcases,
  ShowcasesFlow,
  Stats,
  Subscribe,
  Testimonials,
} from '@/themes/default/blocks';

export default async function DynamicPage({
  locale,
  page,
  data,
}: {
  locale?: string;
  page: DynamicPageType;
  data?: Record<string, any>;
}) {
  return (
    <>
      {page.title && !page.sections?.hero && (
        <h1 className="sr-only">{page.title}</h1>
      )}
      {page?.sections &&
        Object.keys(page.sections).map(async (sectionKey: string) => {
          const section = page.sections?.[sectionKey];
          if (!section) {
            return null;
          }

          // block name
          const block = section.block || section.id || sectionKey;

          switch (block) {
            case 'hero':
              return <Hero key={sectionKey} section={section} />;
            case 'logos':
              return <Logos key={sectionKey} section={section} />;
            case 'features':
              return <Features key={sectionKey} section={section} />;
            case 'features-list':
              return <FeaturesList key={sectionKey} section={section} />;
            case 'features-accordion':
              return <FeaturesAccordion key={sectionKey} section={section} />;
            case 'features-flow':
              return <FeaturesFlow key={sectionKey} section={section} />;
            case 'features-media':
              return <FeaturesMedia key={sectionKey} section={section} />;
            case 'features-step':
              return <FeaturesStep key={sectionKey} section={section} />;
            case 'showcases':
              return <Showcases key={sectionKey} section={section} />;
            case 'showcases-flow':
              return <ShowcasesFlow key={sectionKey} section={section} />;
            case 'stats':
              return <Stats key={sectionKey} section={section} />;
            case 'testimonials':
              return <Testimonials key={sectionKey} section={section} />;
            case 'faq':
              return <FAQ key={sectionKey} section={section} />;
            case 'cta':
              return <CTA key={sectionKey} section={section} />;
            case 'subscribe':
              return <Subscribe key={sectionKey} section={section} />;

            default:
              try {
                if (section.component) {
                  return section.component;
                }

                const DynamicBlock = await getThemeBlock(block);
                return (
                  <DynamicBlock
                    key={sectionKey}
                    section={section}
                    {...(data || section.data || {})}
                  />
                );
              } catch (error) {
                console.log(`Dynamic block "${block}" not found`);
                return null;
              }
          }
        })}
    </>
  );
}
