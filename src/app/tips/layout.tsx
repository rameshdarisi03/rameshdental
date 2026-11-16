import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oral Health & Dental Care Tips | Ramesh Dental Clinic",
  description:
    "Expert dental advice on brushing techniques, clear aligner care, post-op extraction protocols, enamel protection, and gum hygiene from Ramesh Dental Clinic specialists.",
  alternates: {
    canonical: "https://rameshdental.vercel.app/tips",
  },
};

export default function TipsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
