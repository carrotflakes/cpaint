import { BrushPreview } from "../BrushPreview";

export function BrushSelector({
  brushType,
  onChange,
}: {
  brushType: string;
  onChange: (brushType: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {[
        "soft",
        "hard",
        "particle1",
        "particle2",
        "particle3",
        "particle3.1",
        "pixel",
        "cat",
      ].map((type) => (
        <button
          key={type}
          className="p-1 data-[selected=true]:bg-blue-400 cursor-pointer"
          onClick={() => onChange(type)}
          data-selected={brushType === type}
        >
          <BrushPreview brushType={type} />
        </button>
      ))}
    </div>
  );
}
