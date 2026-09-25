import { notFound } from "next/navigation";
import { requireAdmin } from "../../../lib/supabase/dal";
import { AdminPage, adminSlugs, isAdminSlug } from "../admin";

export function generateStaticParams() {
  return adminSlugs.map((slug) => ({ slug: slug ? [slug] : undefined }));
}

export default async function Page({
  params,
}: PageProps<"/admin/[[...slug]]">) {
  const { slug } = await params;
  const route = slug?.[0] ?? "";
  if (slug && slug.length !== 1) notFound();
  if (!isAdminSlug(route)) notFound();
  /* A signed-in non-admin is redirected to /user here, before <AdminPage /> is
     ever evaluated - so the admin tree is not in the response they receive. */
  await requireAdmin();
  return <AdminPage slug={route} />;
}
