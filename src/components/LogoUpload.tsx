import { ImagePlus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED.includes(file.type)) {
      reject(new Error("Please use a PNG, JPG, SVG or WEBP image."));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error("Logo must be smaller than 2 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

export function LogoUpload({
  value,
  onChange,
  label = "Company logo",
}: {
  value: string | null;
  onChange: (logo: string | null) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange(await readImageAsDataUrl(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/50">
          {value ? (
            <img src={value} alt="Logo preview" className="max-h-16 max-w-28 object-contain" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            {value ? "Replace logo" : "Upload logo"}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => onChange(null)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">PNG, JPG, SVG or WEBP · max 2 MB</p>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
