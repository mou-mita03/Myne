import { Home } from "@/components/home";


type BrowsePageProps = {
  searchParams: Promise<{
    search?: string | string[];
  }>;
};


export default async function BrowsePage({
  searchParams,
}: BrowsePageProps) {


  const params = await searchParams;


  const value = params.search;


  const search =
    Array.isArray(value)
      ? value[0]?.slice(0,100) ?? ""
      : value?.slice(0,100) ?? "";


  return (
    <Home
      initialSearch={search}
      view="browse"
    />
  );
}