import { BASE_DOMAIN } from "@/lib/config";
import GridMark from "@/components/brand/GridMark";

export default function InvalidSubdomain({ subdomain }: { subdomain?: string }) {
  const address = subdomain ? `${subdomain}.${BASE_DOMAIN}` : null;
  return (
    <main className="flex min-h-screen flex-col bg-void px-6 font-body text-warm antialiased">
      <div className="mx-auto w-full max-w-6xl py-6 lg:px-4">
        <a href={`https://${BASE_DOMAIN}`} className="inline-flex items-center gap-3">
          <GridMark />
          <span className="font-display text-[19px] font-semibold tracking-tight">Erpcore</span>
        </a>
      </div>
      <div className="flex flex-1 items-center justify-center pb-24 pt-8">
        <div className="w-full max-w-[26rem]">
          <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.02em]">No school at this address</h1>
          <p className="mt-4 text-[15.5px] leading-[1.65] text-warm-400">
            {address ? (
              <>
                There&apos;s no school registered at <span className="whitespace-nowrap text-warm">{address}</span>. Check the
                address your school gave you for typos.
              </>
            ) : (
              <>This school portal address isn&apos;t recognised. Check the link your school gave you.</>
            )}
          </p>
          <p className="mt-4 text-[15.5px] leading-[1.65] text-warm-400">
            School portals look like <span className="whitespace-nowrap text-warm">yourschool.{BASE_DOMAIN}</span>. If you
            can&apos;t find yours, ask the school office.
          </p>
        </div>
      </div>
    </main>
  );
}
