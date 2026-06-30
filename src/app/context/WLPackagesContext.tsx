import React, { createContext, useContext, useState, useEffect } from "react";
import { subscribeToPackages, type WLPackage } from "../services/wlPackages";

interface WLPackagesCtx {
  packages: WLPackage[];
}

const Ctx = createContext<WLPackagesCtx>({ packages: [] });

export function WLPackagesProvider({ children }: { children: React.ReactNode }) {
  const [packages, setPackages] = useState<WLPackage[]>([]);

  useEffect(() => {
    // Subscribe: whenever admin edits a package, landing page re-renders automatically
    const unsub = subscribeToPackages(setPackages);
    return unsub;
  }, []);

  return <Ctx.Provider value={{ packages }}>{children}</Ctx.Provider>;
}

export function useWLPackages() {
  return useContext(Ctx);
}
