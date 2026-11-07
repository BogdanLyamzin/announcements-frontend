import { notFound } from "next/navigation";
import { AnnouncementDetails } from "@/components/announcement-details";
export const metadata = { title: "Оголошення" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  return <AnnouncementDetails id={Number(id)} />;
}
