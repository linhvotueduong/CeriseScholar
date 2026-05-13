/**
 * Hedgehog mascot image paths.
 * Images are served as static files from public/assets/hedgehogs/ instead of
 * being bundled as 2MB+ of base64 into the JS bundle.
 */
const HEDGEHOG = {
  hedgehog01Start: "/assets/hedgehogs/hedgehog01Start.png",
  hedgehog02Writing: "/assets/hedgehogs/hedgehog02Writing.png",
  hedgehog03Standing: "/assets/hedgehogs/hedgehog03Standing.png",
  hedgehog04RedPen: "/assets/hedgehogs/hedgehog04RedPen.png",
  hedgehog05Laptop: "/assets/hedgehogs/hedgehog05Laptop.png",
  hedgehog06Clasped: "/assets/hedgehogs/hedgehog06Clasped.png",
  hedgehog07Clipboard: "/assets/hedgehogs/hedgehog07Clipboard.png",
  hedgehog08Refs: "/assets/hedgehogs/hedgehog08Refs.png",
  hedgehog09Notepad: "/assets/hedgehogs/hedgehog09Notepad.png",
  hedgehog10Magnifier: "/assets/hedgehogs/hedgehog10Magnifier.png",
  hedgehog11LitBook: "/assets/hedgehogs/hedgehog11LitBook.png",
} as const;

export default HEDGEHOG;
