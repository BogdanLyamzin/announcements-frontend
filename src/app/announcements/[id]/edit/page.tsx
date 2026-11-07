import { notFound } from "next/navigation";
import { AnnouncementForm } from "@/components/announcement-form";
export const metadata = { title: "Редагувати оголошення" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  return <AnnouncementForm id={Number(id)} />;
}
