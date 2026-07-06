import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getSession } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  // Define an endpoint that accepts PDFs or Images, max 4MB
  facilityDocument: f({ pdf: { maxFileSize: "4MB", maxFileCount: 1 }, image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await getSession();
      if (session?.role !== "admin") throw new Error("Unauthorized");
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ file }) => {
      // The file URL is available here, but we'll save it via the client 
      // calling our server action so we can show loading states properly.
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;