// app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getSession } from "@/lib/auth";

const f = createUploadthing();

const adminMiddleware = async () => {
  const session = await getSession();
  if (session?.role !== "admin") throw new Error("Unauthorized");
  return { userId: session.userId };
};

export const ourFileRouter = {
  facilityDocument: f({ pdf: { maxFileSize: "4MB", maxFileCount: 1 }, image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(adminMiddleware)
    .onUploadComplete(async ({ file }) => { return { url: file.ufsUrl }; }),
    
  timeTableDocument: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(adminMiddleware)
    .onUploadComplete(async ({ file }) => { return { url: file.ufsUrl }; }),
    
  doorPicDocument: f({ pdf: { maxFileSize: "4MB", maxFileCount: 1 }, image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(adminMiddleware)
    .onUploadComplete(async ({ file }) => { return { url: file.ufsUrl }; }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;