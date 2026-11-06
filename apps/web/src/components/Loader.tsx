export function Loader({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 dark:border-slate-600" />
      {label ? <span className="text-sm">{label}</span> : <span className="sr-only">Загрузка</span>}
    </div>
  );
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader label={label ?? 'Загрузка…'} />
    </div>
  );
}
