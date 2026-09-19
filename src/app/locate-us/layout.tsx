import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Locate Us & Clinic Address | Whitefield, Bengaluru",
  description:
    "Visit Gait Physio Clinic on ITPL Main Road, near Hope Farm Signal, Whitefield, Bengaluru. Get clinic directions, contact numbers, and operating hours.",
  alternates: {
    canonical: "https://gaitphysioclinic.com/locate-us",
  },
  openGraph: {
    title: "Locate Gait Physio Clinic | Whitefield, Bengaluru",
    description:
      "Clinic address, landmark near Hope Farm Signal, parking availability, metro connectivity, and working hours.",
    url: "https://gaitphysioclinic.com/locate-us",
  },
};

export default function LocateUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
