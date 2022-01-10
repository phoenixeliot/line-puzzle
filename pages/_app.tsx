import "../styles/globals.css";
import type { AppProps } from "next/app";

// MobX compilation feature check
if (
  !new (class {
    x;
  })().hasOwnProperty("x")
)
  throw new Error("Transpiler is not configured correctly");

// Disable server side rendering for debugging
function SafeHydrate({ children }) {
  return (
    <div suppressHydrationWarning>{typeof window === "undefined" ? null : children}</div>
  );
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SafeHydrate>
      <Component {...pageProps} />
    </SafeHydrate>
  );
}

// function MyApp({ Component, pageProps }: AppProps) {
//   return <Component {...pageProps} />;
// }

export default MyApp;
