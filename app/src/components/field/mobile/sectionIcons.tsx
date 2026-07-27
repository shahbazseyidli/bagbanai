// IconName → lucide component, for the phone's "Daha çox" list.
//
// This is a DUPLICATE of the map in components/shell/FieldSectionMenu.tsx, and knowingly so: that
// file belongs to the shell and is not editable in this pass, so the alternative was to import a
// private const out of a component module. Both maps are keyed by `IconName` from
// lib/fieldSections, so a new icon name fails to compile in BOTH places at once rather than
// rendering `undefined` in one of them — which is the property that makes the duplication safe.
//
// If the two ever want to move: lift this file to lib/ and have FieldSectionMenu import it. Nothing
// here is phone-specific.
import {
  Activity, Calendar, Camera, Check, Cloud, FileText, FlaskConical, Info, Layers, Map,
  Mountain, Package, ScanEye, Sparkles, TrendingUp, Wrench,
} from "lucide-react";
import type { IconName } from "@/lib/fieldSections";

export const SECTION_ICONS: Record<IconName, typeof Sparkles> = {
  pulse: Sparkles,
  satellite: Layers,
  analysis: Activity,
  weather: Cloud,
  zones: Map,
  tasks: Check,
  fertilizer: FlaskConical,
  photos: Camera,
  scouting: ScanEye,
  operations: Wrench,
  yields: TrendingUp,
  harvest: Package,
  season: Calendar,
  soil: Mountain,
  metadata: Info,
  documents: FileText,
};
