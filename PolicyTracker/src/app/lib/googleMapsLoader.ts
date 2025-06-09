import { useJsApiLoader } from "@react-google-maps/api";

export const libraries: (
  "places" | "geometry" | "drawing" | "visualization" | "marker"
)[] = ["places", "marker"];

export function useGoogleMapsLoader() {
  return useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ["places", "marker"],
     language: "th",
  });
}
