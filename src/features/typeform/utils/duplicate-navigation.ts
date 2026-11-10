export function getDuplicateListDestination(destination: string, currentQuery: string) {
  const [pathname, destinationQuery = ""] = destination.split("?");
  const params = new URLSearchParams(destinationQuery);
  const currentPageSize = new URLSearchParams(currentQuery).get("pageSize");
  if (currentPageSize && ["6", "12", "24", "48"].includes(currentPageSize)) {
    params.set("pageSize", currentPageSize);
  }
  params.set("page", "1");
  params.delete("clonedFrom");
  return `${pathname}?${params.toString()}`;
}