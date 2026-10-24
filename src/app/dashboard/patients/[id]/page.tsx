import PatientProfileWrapper from "./PatientProfileWrapper";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id || "");

  return <PatientProfileWrapper id={decodedId} />;
}
