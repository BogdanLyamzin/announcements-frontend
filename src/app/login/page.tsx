import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Вхід" };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={next} />;
}
