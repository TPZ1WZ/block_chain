const DEFAULT_UPLOAD_API = "http://localhost:8787";

export async function uploadFileToIPFS(file, name) {
  if (!file) return null;

  const baseUrl = (
    import.meta.env.VITE_UPLOAD_API_URL || DEFAULT_UPLOAD_API
  ).replace(/\/$/, "");
  const form = new FormData();

  form.append("file", file);
  if (name) form.append("name", name);

  const response = await fetch(`${baseUrl}/api/ipfs/upload`, {
    method: "POST",
    body: form,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Upload IPFS failed");
  }

  return payload;
}

export function ipfsToGatewayUrl(uri) {
  if (!uri?.startsWith("ipfs://")) return uri;
  return `https://gateway.pinata.cloud/ipfs/${uri.slice("ipfs://".length)}`;
}
