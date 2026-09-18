import { Reader } from "@/components/reader";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ href?: string }>;
}) {

  const [
    { id },
    { href }
  ] = await Promise.all([
    params,
    searchParams,
  ]);


  const bookKey =
    decodeURIComponent(id)
      .slice(0, 200);


  const initialHref =
    typeof href === "string"
      ? href.slice(0, 300)
      : undefined;


  return (
    <Reader
      bookKey={bookKey}
      initialHref={initialHref}
    />
  );
}