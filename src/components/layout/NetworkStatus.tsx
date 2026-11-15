"use client";

import { useEffect, useState } from "react";
import { ErrorAlert } from "./ErrorAlert";

export function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return offline ? <ErrorAlert>You appear to be offline. You can keep reading loaded stories. Reconnect, then retry your request.</ErrorAlert> : null;
}
