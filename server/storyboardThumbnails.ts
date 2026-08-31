import { generateImage } from "./_core/imageGeneration";
import { getProjectDesign, updateStoryboardThumbnail } from "./designDb";

export async function generateStoryboardThumbnails(projectId: number, userId: number) {
  const design = await getProjectDesign(projectId, userId);
  for (const panel of design.storyboard) {
    if (panel.thumbnailUrl) continue;
    await updateStoryboardThumbnail(panel.id, userId, null, "generating");
    try {
      const { url } = await generateImage({ prompt: `A restrained editorial storyboard thumbnail for this product-design moment: "${panel.caption}". Use a minimal flat illustration, off-white background, crisp black linework, and one scarlet-red square accent. No text, no logos, no people photographed, 16:9 composition.` });
      if (!url) throw new Error("The image service returned no thumbnail URL.");
      await updateStoryboardThumbnail(panel.id, userId, url, "ready");
    } catch (error) {
      await updateStoryboardThumbnail(panel.id, userId, null, "failed");
      console.warn("[Storyboard] Thumbnail generation failed:", error);
    }
  }
  return getProjectDesign(projectId, userId);
}
