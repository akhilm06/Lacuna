export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="flex flex-1 flex-col items-center justify-start px-6 pt-5 sm:pt-6">
        <h1 className="text-4xl font-semibold tracking-tight">Lacuna</h1>
        <p className="mt-4 w-full max-w-full overflow-x-auto text-center text-lg leading-relaxed whitespace-nowrap">
          A library of known and lost works visualized by interactive nodes.
        </p>
        <div className="mt-6 self-stretch">
          <hr className="border-0 border-t border-lacuna-border" />
        </div>
      </main>
    </div>
  );
}
