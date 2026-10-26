import DualTasteApp from "../components/DualTasteApp";
import { PRESETS, CITIES } from "../fixtures/presets";

export default function Home() {
  return <DualTasteApp presets={PRESETS} cities={CITIES} />;
}
