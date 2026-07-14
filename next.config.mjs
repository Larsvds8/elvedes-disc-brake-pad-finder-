// Bij deployment onder een subpad (bv. https://<user>.github.io/<repo>/):
// NEXT_PUBLIC_BASE_PATH="/<repo>" zetten bij de build.
// Voor een file://-build (dubbelklikbare index.html): NEXT_PUBLIC_BASE_PATH="."
// — dat maakt de afbeeldingspaden in de app relatief; basePath zelf moet dan
// leeg blijven (Next eist een leading slash). Zie scripts/build-local.mjs.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export voor GitHub Pages-deployment (geen backend nodig)
  output: "export",
  images: { unoptimized: true },
  basePath: basePath.startsWith("/") ? basePath : "",
  trailingSlash: true,
};

export default nextConfig;
