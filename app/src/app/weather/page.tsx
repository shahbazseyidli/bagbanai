"use client";

// /weather — the "Hava" tab of the five-tab mobile shell (ONESOIL_MOBILE_TEARDOWN §3).
//
// Thin by design: the screen decides its own layout from a MEASURED stage width, so a route file
// that wrapped it in a container would be handing that measurement a predetermined answer. Every
// request, every branch and the Suspense boundary useSearchParams needs live in the component.
import WeatherScreen from "@/components/weather/WeatherScreen";

export default function WeatherPage() {
  return <WeatherScreen />;
}
