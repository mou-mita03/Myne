import { ReaderOverview } from "@/components/reader-overview";

export default async function Page({
  params,
}: {
  params: Promise<{ id:string }>;
}) {

  const { id } = await params;


  return (
    <ReaderOverview
      bookKey={
        decodeURIComponent(id)
          .slice(0,200)
      }
    />
  );
}