import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clinical Articles, Health Guides & Research",
  description:
    "Evidence-based clinical physiotherapy articles, biomechanical research, injury rehabilitation guides, and recovery tips written by licensed clinicians at Gait Physio Clinic.",
  alternates: {
    canonical: "https://gaitphysioclinic.com/articles",
  },
};

export default function ArticlesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
