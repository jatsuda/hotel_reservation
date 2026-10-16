import ImagePlaceholder from "./ImagePlaceholder";

interface GalleryImage {
  label: string;
  note: string;
  src?: string; // real image path/URL - falls back to the placeholder if missing or fails to load
}

interface HotelGalleryProps {
  images: GalleryImage[]; // first item renders large, the rest stack beside it
}

const SIDE_SLOTS = 3;

/**
 * Gallery layout for the hotel detail page: one large main image on the
 * left, up to three smaller images stacked on the right, and any further
 * photos in a thumbnail row underneath.
 *
 * Every frame has a fixed size (a 420px-tall block on sm+, a 4:3 box on
 * mobile) and the photo is cropped to it with object-cover, so photos of any
 * size or orientation always sit inside their frame.
 */
export default function HotelGallery({ images }: HotelGalleryProps) {
  const [main, ...rest] = images;
  const side = rest.slice(0, SIDE_SLOTS);
  const extra = rest.slice(SIDE_SLOTS);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:h-[420px] sm:grid-cols-3">
        <div
          className={`relative aspect-[4/3] min-h-0 sm:aspect-auto sm:h-full ${
            side.length > 0 ? "sm:col-span-2" : "sm:col-span-3"
          }`}
        >
          {/* IMAGE PLACEHOLDER (shown if main.src is empty or fails to load): {main.note} */}
          <ImagePlaceholder fill src={main.src} label={main.label} note={main.note} />
        </div>

        {side.length > 0 && (
          <div
            className="grid min-h-0 grid-cols-1 gap-3 sm:h-full"
            style={{ gridTemplateRows: `repeat(${side.length}, minmax(0, 1fr))` }}
          >
            {side.map((img, i) => (
              <div key={`${img.label}-${i}`} className="relative aspect-[4/3] min-h-0 sm:aspect-auto">
                {/* IMAGE PLACEHOLDER: {img.note} */}
                <ImagePlaceholder fill src={img.src} label={img.label} note={img.note} />
              </div>
            ))}
          </div>
        )}
      </div>

      {extra.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {extra.map((img, i) => (
            <div key={`${img.label}-${i}`} className="relative aspect-[4/3]">
              <ImagePlaceholder fill src={img.src} label={img.label} note={img.note} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
