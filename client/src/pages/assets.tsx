import { AssetGenerator } from "@/components/asset-generator";

export function AssetsPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Game Asset Generator</h1>
      <p className="text-muted-foreground mb-8">
        Use AI to generate custom images and icons for your game. Create pixel art characters, 
        background elements, or UI icons to enhance your game's visual appeal.
      </p>
      <AssetGenerator />
    </div>
  );
}