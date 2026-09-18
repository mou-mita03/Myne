import { BookDetails } from "@/components/book-details";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <BookDetails id={id} />; }
