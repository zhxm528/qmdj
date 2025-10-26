export default function Skeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square bg-gray-200 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

