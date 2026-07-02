/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export voor GitHub Pages-deployment (geen backend nodig)
  output: "export",
  images: { unoptimized: true },
  // Bij deployment onder een subpad (bv. https://<user>.github.io/<repo>/):
  // NEXT_PUBLIC_BASE_PATH="/<repo>" zetten bij de build.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
};

export default nextConfig;
