export default function ShopifyPage() {
  return (
    <div className="px-6 py-8 max-w-[900px] mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Shopify</p>
        <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Stock Sync</h1>
      </div>
      <div className="text-center py-16 border border-dashed border-border rounded-xl">
        <p className="text-[13px] font-semibold text-foreground mb-2">Coming Soon</p>
        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
          Shopify inventory sync will be available once you configure your Shopify Admin API credentials in Settings.
        </p>
      </div>
    </div>
  );
}
