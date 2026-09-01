function cleanArticleTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let title = rawTitle.trim();

  // Decode common HTML entities
  title = title
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Strip YouTube / broadcast markers
  title = title
    .replace(/^🔴\s*/g, '')
    .replace(/🔴/g, '')
    .replace(/^LIVE\s*:\s*/i, '')
    .replace(/^WATCH LIVE\s*:\s*/i, '')
    .replace(/^WATCH\s*:\s*/i, '')
    .replace(/\s*\|\s*WATCH\s*$/i, '')
    .replace(/\s*\|\s*VIDEO\s*$/i, '')
    .replace(/\s*\[video\]\s*/gi, ' ')
    .replace(/\s*\(WATCH\)\s*/gi, ' ')
    .replace(/\s*#\w+/g, ' ') // remove hashtags like #BreakingNews #IndianFlag
    .replace(/\b\d{1,2}:\d{2}\s*(?:A\.M\.|P\.M\.|AM|PM)\b[^\n]*/gi, '') // e.g. 5:00 P.M. Weather
    .trim();

  // Remove publisher suffixes like " - Amar Ujala", " - NDTV", " - The Hindu", " | RTV", " | TV9"
  const dashSplit = title.split(/\s+[-|–—]\s+/);
  if (dashSplit.length > 1) {
    const lastPart = dashSplit[dashSplit.length - 1].trim();
    if (lastPart.length < 35 && dashSplit[0].trim().length > 15) {
      title = dashSplit.slice(0, dashSplit.length - 1).join(' - ').trim();
    }
  }

  // Clean whitespace
  title = title.replace(/\s+/g, ' ').trim();
  return title;
}

const tests = [
  "Dr. Dandepu Baswanandam | Call : 94409 30317 | Hyderabad | AP | RTV",
  "Planning to buy a home in a gated community PVR Group Builders and Developers | RTV",
  "🔴 LIVE: Action News Live at 6pm - Amar Ujala",
  "Konkani Prime News 310826 - Prudent Media",
  " - Amar Ujala",
  "5:00 P.M. Weather - Amar Ujala",
  "USA లో ఖలిస్థానీ నిరసనలు.. జాతీయ జెండాకు అగౌరవం! | Khalistan Disrespect INDIAN Flag | RTV #Tricolour #IndianFlag"
];

for (const t of tests) {
  console.log(`Original: "${t}"`);
  console.log(`Cleaned:  "${cleanArticleTitle(t)}"`);
  console.log('---');
}
