// Free domain availability check via RDAP (no API key required).
export async function checkDomainAvailability(businessName) {
  const slug = businessName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "");

  if (!slug) return null;

  const domain = `${slug}.com`;

  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { Accept: "application/rdap+json" },
    });

    if (res.status === 404) {
      return { domain, available: true };
    }
    if (res.ok) {
      return { domain, available: false };
    }
    return { domain, available: null };
  } catch {
    return { domain, available: null };
  }
}