export function SourceBlock({ source, definition }: { source: string; definition: string }) {
  return (
    <footer className="source-block">
      <p>{source}</p>
      <p>{definition}</p>
    </footer>
  );
}
