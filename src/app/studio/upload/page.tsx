import { StudioHeader } from "@/components/studio/StudioHeader";
import { UploadForm } from "@/components/studio/UploadForm";
import { getUploadTargets, requireAdminPage } from "@/lib/studio";
import { listShared } from "@/lib/studio-share";

export const metadata = { title: "Upload" };

type Props = { searchParams: Promise<{ target?: string; share?: string }> };

export default async function StudioUpload({ searchParams }: Props) {
  const { target, share } = await searchParams;
  await requireAdminPage("/studio/upload");
  const targets = await getUploadTargets();
  const files = share ? await listShared(share) : null;

  return (
    <>
      <StudioHeader title="upload" />
      <p className="-mt-4 mb-8 text-muted-foreground">
        {files ? `${files.length} photos shared from your gallery — where should they go?` : "Photos go straight into Nextcloud, then onto the site."}
      </p>
      {share && !files && <p className="mb-6 text-rec">Those shared photos are gone — share them again.</p>}
      <UploadForm targets={targets} initialTarget={target} shared={files && share ? { token: share, files } : undefined} />
      <p className="readout mt-10 text-muted-foreground">On Android: share photos from your gallery to “Photos by …” to land here.</p>
    </>
  );
}
