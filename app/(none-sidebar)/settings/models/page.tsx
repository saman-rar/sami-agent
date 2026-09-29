import { ModelSelector } from '@/components/ai-elements/model-selector';

export default function ModelsSettingsPage() {
  return (
    <div className='mx-auto w-full max-w-3xl'>
      <div className='mb-8'>
        <h1 className='text-xl font-semibold tracking-tight'>Models</h1>
        <p className='mt-1 max-w-2xl text-sm leading-6 text-muted-foreground'>
          Choose the model Eve resolves for agent work. Models are discovered
          from connected providers instead of being maintained as a hardcoded
          catalog.
        </p>
      </div>
      <div className='border-y py-5'>
        <div className='mb-2 text-sm font-medium'>Active model</div>
        <ModelSelector compact={false} />
      </div>
    </div>
  );
}
