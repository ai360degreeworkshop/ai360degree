import { notFound } from "next/navigation";
import { requireUser } from "../../../lib/supabase/dal";
import {
  DashboardPage,
  dashboardSlugs,
  isDashboardSlug,
} from "../user";

export function generateStaticParams() {
  return dashboardSlugs.map((slug) => ({ slug: slug ? [slug] : undefined }));
}

export default async function Page({
  params,
}: PageProps<"/user/[[...slug]]">) {
  const { slug } = await params;
  const route = slug?.[0] ?? "";
  if (slug && slug.length !== 1) notFound();
  if (!isDashboardSlug(route)) notFound();
  /* Before the tree is built, so a signed-out visitor gets a redirect instead of
     dashboard markup in the payload. proxy.ts has already turned away the
     obviously-anonymous case; this is the authoritative check. */
  await requireUser();
  return <DashboardPage slug={route} />;
}
