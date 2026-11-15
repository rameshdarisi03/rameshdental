import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dental Articles, Oral Health Guides & Research",
  description:
    "Evidence-based dental health articles, procedure guides on root canals, implants, aligners, and tooth care written by licensed dental specialists at Ramesh Dental Clinic.",
  alternates: {
    canonical: "https://rameshdental.vercel.app/articles",
  },
};

export default function ArticlesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
