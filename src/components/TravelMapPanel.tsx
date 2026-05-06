"use client";

import dynamic from "next/dynamic";

type TravelMapPoint = {
  id: string;
  name: string;
  type: "VISITED" | "WANT_TO_GO" | "TRIP";
  lat: number;
  lng: number;
};

type TravelMapPanelProps = {
  points: TravelMapPoint[];
};

const TravelMap = dynamic(() => import("@/components/TravelMap"), { ssr: false });

export default function TravelMapPanel({ points }: TravelMapPanelProps) {
  return <TravelMap points={points} />;
}
