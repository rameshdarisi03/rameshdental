import PatientProfileWrapper from "./PatientProfileWrapper";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PatientProfileWrapper id={id} />;
}
