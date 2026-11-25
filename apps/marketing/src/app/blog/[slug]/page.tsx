import ProjectUpdates from '../page';

export { metadata } from '../page';

export function generateStaticParams() {
  return [
    'introducing-culinaryos',
    'ai-changing-restaurant-ops',
    'open-core-licensing-why-we-chose-mit',
  ].map((slug) => ({ slug }));
}

export default ProjectUpdates;
