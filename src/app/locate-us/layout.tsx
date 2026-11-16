import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Locate Us & Clinic Address | Ramesh Dental Clinic Whitefield",
  description:
    "Visit Ramesh Dental Clinic at Metro Pillar 142, ITPL Main Road, Whitefield, Bengaluru. Get clinic directions, contact numbers, and working hours.",
  alternates: {
    canonical: "https://rameshdental.vercel.app/locate-us",
  },
  openGraph: {
    title: "Locate Ramesh Dental Clinic | Whitefield, Bengaluru",
    description:
      "Clinic address, landmark at Metro Pillar 142, parking availability, metro connectivity, and dental consultation hours.",
    url: "https://rameshdental.vercel.app/locate-us",
  },
};

export default function LocateUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
