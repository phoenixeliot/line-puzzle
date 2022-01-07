import React from "react";
import { Provider } from "react-redux";
import { store } from "../src/app/store";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import App from "../src/App";

// Disable server side rendering for debugging
function SafeHydrate({ children }) {
  return (
    <div suppressHydrationWarning>{typeof window === "undefined" ? null : children}</div>
  );
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SafeHydrate>
      <React.StrictMode>
        <Provider store={store}>
          <Component {...pageProps} />
        </Provider>
      </React.StrictMode>
    </SafeHydrate>
  );
}

// function MyApp({ Component, pageProps }: AppProps) {
//   return <Component {...pageProps} />;
// }

export default MyApp;
