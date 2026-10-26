// Synthetic stand-in for Qloo's taste graph, used until QLOO_API_KEY is set.
// Entity names are real, but tags, popularity and affinity scores are invented
// sample data shaped like Qloo responses — never present them as Qloo output.

const TAGS = {
  afrobeats: { name: "Afrobeats", keywords: ["afrobeats", "afrobeat pop", "naija"] },
  afrofusion: { name: "Afro-fusion", keywords: ["afro-fusion", "afrofusion"] },
  afrobeat: { name: "Afrobeat (Fela-era)", keywords: ["afrobeat", "fela"] },
  alte: { name: "Alté", keywords: ["alte", "alté"] },
  amapiano: { name: "Amapiano", keywords: ["amapiano"] },
  highlife: { name: "Highlife", keywords: ["highlife"] },
  rnb: { name: "R&B / soul", keywords: ["r&b", "rnb", "soul"] },
  rap: { name: "Rap / street-pop", keywords: ["rap", "hip hop", "street pop", "street-pop"] },
  nigerian_food: { name: "Nigerian cuisine", keywords: ["nigerian food", "jollof", "jollof rice", "egusi", "egusi soup", "pounded yam", "suya", "puff puff", "pepper soup", "amala", "nigerian"] },
  west_african_food: { name: "West African cuisine", keywords: ["west african", "fufu", "waakye", "thieboudienne", "jollof"] },
  grill: { name: "Grill / suya spot", keywords: ["suya", "grill", "bbq"] },
  fine_dining: { name: "Fine dining", keywords: ["fine dining", "tasting menu"] },
  casual_dining: { name: "Casual dining", keywords: ["casual"] },
  live_music: { name: "Live music venue", keywords: ["live music", "concert", "gig"] },
  club_night: { name: "Afro club nights", keywords: ["club", "nightlife", "afro night", "owambe"] },
  nollywood: { name: "Nollywood", keywords: ["nollywood", "nigerian film", "nigerian movie"] },
  comedy: { name: "Comedy", keywords: ["comedy", "funny"] },
  romance: { name: "Romance", keywords: ["romance", "romcom", "wedding"] },
  crime: { name: "Crime / thriller", keywords: ["crime", "thriller", "gangster"] },
  epic: { name: "Yoruba historical epic", keywords: ["epic", "historical", "yoruba"] },
  drama: { name: "Drama", keywords: ["drama"] },
  lagos: { name: "Set in Lagos", keywords: ["lagos"] },
  diaspora: { name: "Diaspora story", keywords: ["diaspora", "abroad", "immigrant"] },
  family: { name: "Family", keywords: ["family"] },
  ghana: { name: "Ghanaian scene", keywords: ["ghana", "ghanaian", "accra"] },
  // Non-heritage signals: the bridges to things outside Nigerian/African culture
  uk_rap: { name: "UK rap / grime", keywords: ["uk rap", "grime", "drill"] },
  afroswing: { name: "Afroswing", keywords: ["afroswing"] },
  jazz: { name: "Jazz", keywords: ["jazz"] },
  spice_forward: { name: "Bold, spice-forward food", keywords: ["spicy", "jollof", "jollof rice", "suya", "pepper soup", "egusi", "egusi soup"] },
  soul_food: { name: "Soul food", keywords: ["soul food"] },
  uk_setting: { name: "Set in London", keywords: ["london"] },
};

const tagUrn = key => `urn:tag:fixture:${key}`;

// [name, type, popularity 0-1, tag keys, extra]
const RAW = [
  // Artists
  ["Burna Boy", "artist", 0.97, ["afrobeats", "afrofusion", "afrobeat", "rnb"]],
  ["Wizkid", "artist", 0.96, ["afrobeats", "afrofusion", "rnb"]],
  ["Davido", "artist", 0.94, ["afrobeats", "club_night"]],
  ["Tems", "artist", 0.9, ["rnb", "alte", "afrofusion"]],
  ["Asake", "artist", 0.88, ["afrobeats", "amapiano", "rap", "club_night"]],
  ["Rema", "artist", 0.9, ["afrobeats", "afrofusion", "rap"]],
  ["Ayra Starr", "artist", 0.85, ["afrobeats", "rnb"]],
  ["Fireboy DML", "artist", 0.8, ["afrobeats", "rnb", "highlife"]],
  ["Omah Lay", "artist", 0.78, ["afrofusion", "rnb", "alte"]],
  ["Olamide", "artist", 0.8, ["rap", "afrobeats", "club_night"]],
  ["Tiwa Savage", "artist", 0.82, ["afrobeats", "rnb"]],
  ["Fela Kuti", "artist", 0.86, ["afrobeat", "highlife"]],
  ["Seun Kuti", "artist", 0.55, ["afrobeat", "live_music"]],
  ["CKay", "artist", 0.72, ["afrobeats", "rnb"]],
  ["Show Dem Camp", "artist", 0.5, ["alte", "rap", "highlife"]],
  ["Odumodublvck", "artist", 0.6, ["rap", "club_night"]],
  ["Amaarae", "artist", 0.62, ["alte", "rnb", "ghana"]],
  ["Black Sherif", "artist", 0.7, ["rap", "highlife", "ghana"]],
  ["Tyla", "artist", 0.84, ["amapiano", "rnb"]],
  ["Jorja Smith", "artist", 0.74, ["rnb", "uk_rap"]],
  ["J Hus", "artist", 0.72, ["afroswing", "uk_rap", "rap", "club_night"]],
  ["Dave", "artist", 0.76, ["uk_rap", "rap"]],
  ["Little Simz", "artist", 0.66, ["uk_rap", "rap", "jazz"]],
  ["Stormzy", "artist", 0.8, ["uk_rap", "rap", "live_music"]],
  ["Drake", "artist", 0.98, ["rap", "rnb", "club_night"]],
  ["SZA", "artist", 0.9, ["rnb"]],

  // Film / TV
  ["The Wedding Party", "movie", 0.8, ["nollywood", "comedy", "romance", "lagos", "family"]],
  ["The Wedding Party 2", "movie", 0.66, ["nollywood", "comedy", "romance", "diaspora"]],
  ["King of Boys", "movie", 0.78, ["nollywood", "crime", "drama", "lagos"]],
  ["Lionheart", "movie", 0.7, ["nollywood", "comedy", "drama", "family"]],
  ["Anikulapo", "movie", 0.74, ["nollywood", "epic", "drama"]],
  ["Jagun Jagun", "movie", 0.68, ["nollywood", "epic"]],
  ["Gangs of Lagos", "movie", 0.66, ["nollywood", "crime", "lagos"]],
  ["A Tribe Called Judah", "movie", 0.72, ["nollywood", "comedy", "crime", "lagos", "family"]],
  ["Òlòturé", "movie", 0.58, ["nollywood", "drama", "crime", "lagos"]],
  ["Battle on Buka Street", "movie", 0.6, ["nollywood", "comedy", "family"]],
  ["The Black Book", "movie", 0.7, ["nollywood", "crime", "drama"]],
  ["Mami Wata", "movie", 0.5, ["drama", "epic"]],
  ["Top Boy", "movie", 0.8, ["crime", "drama", "diaspora", "uk_setting"]],
  ["Blue Story", "movie", 0.6, ["crime", "drama", "uk_setting"]],
  ["Rocks", "movie", 0.52, ["drama", "diaspora", "family", "uk_setting"]],
  ["Atlanta", "movie", 0.82, ["comedy", "drama", "rap"]],
  ["Insecure", "movie", 0.74, ["comedy", "romance", "rnb"]],
  ["Coming 2 America", "movie", 0.66, ["comedy", "romance", "family", "diaspora"]],
  ["Black Panther: Wakanda Forever", "movie", 0.9, ["drama", "rnb", "diaspora"]],

  // Places — London
  ["Chuku's", "place", 0.62, ["nigerian_food", "casual_dining", "club_night"], { city: "London", area: "Tottenham" }],
  ["Ikoyi", "place", 0.7, ["west_african_food", "fine_dining"], { city: "London", area: "St James's" }],
  ["Akoko", "place", 0.6, ["west_african_food", "nigerian_food", "fine_dining"], { city: "London", area: "Fitzrovia" }],
  ["805 Restaurant", "place", 0.58, ["nigerian_food", "grill", "casual_dining"], { city: "London", area: "Old Kent Road" }],
  ["Enish", "place", 0.56, ["nigerian_food", "casual_dining", "club_night"], { city: "London", area: "Lewisham" }],
  ["Jazz Cafe", "place", 0.72, ["live_music", "rnb", "afrobeat"], { city: "London", area: "Camden" }],
  ["O2 Academy Brixton", "place", 0.8, ["live_music", "afrobeats"], { city: "London", area: "Brixton" }],
  ["Electric Brixton", "place", 0.6, ["club_night", "live_music", "amapiano"], { city: "London", area: "Brixton" }],
  ["KOKO", "place", 0.72, ["live_music", "club_night", "rap"], { city: "London", area: "Camden" }],
  ["Ronnie Scott's", "place", 0.74, ["jazz", "live_music"], { city: "London", area: "Soho" }],
  ["Dishoom", "place", 0.82, ["spice_forward", "casual_dining"], { city: "London", area: "King's Cross" }],
  ["Roti King", "place", 0.6, ["spice_forward", "casual_dining"], { city: "London", area: "Euston" }],

  // Places — New York
  ["Buka", "place", 0.55, ["nigerian_food", "casual_dining"], { city: "New York", area: "Brooklyn" }],
  ["Teranga", "place", 0.52, ["west_african_food", "casual_dining"], { city: "New York", area: "Harlem" }],
  ["Africa Kine", "place", 0.5, ["west_african_food", "casual_dining"], { city: "New York", area: "Harlem" }],
  ["S.O.B.'s", "place", 0.68, ["live_music", "club_night", "afrobeats"], { city: "New York", area: "Hudson Square" }],
  ["Brooklyn Steel", "place", 0.7, ["live_music", "rnb"], { city: "New York", area: "Brooklyn" }],
  ["Le Poisson Rouge", "place", 0.6, ["live_music", "alte", "afrobeat"], { city: "New York", area: "Greenwich Village" }],
  ["Apollo Theater", "place", 0.84, ["live_music", "rnb", "comedy"], { city: "New York", area: "Harlem" }],
  ["Blue Note", "place", 0.72, ["jazz", "live_music"], { city: "New York", area: "Greenwich Village" }],
  ["Sylvia's", "place", 0.7, ["soul_food", "spice_forward", "casual_dining"], { city: "New York", area: "Harlem" }],

  // Places — Toronto
  ["Massey Hall", "place", 0.74, ["live_music", "rnb"], { city: "Toronto", area: "Downtown" }],
  ["History", "place", 0.66, ["live_music", "afrobeats"], { city: "Toronto", area: "Leslieville" }],
  ["Lula Lounge", "place", 0.5, ["live_music", "afrobeat", "club_night"], { city: "Toronto", area: "Dundas West" }],
  ["The Danforth Music Hall", "place", 0.6, ["live_music", "alte"], { city: "Toronto", area: "Danforth" }],
  ["The Rex Hotel Jazz & Blues Bar", "place", 0.62, ["jazz", "live_music"], { city: "Toronto", area: "Queen West" }],
  ["Pai", "place", 0.78, ["spice_forward", "casual_dining"], { city: "Toronto", area: "Entertainment District" }],
];

const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const ENTITIES = RAW.map(([name, type, popularity, tags, extra = {}]) => ({
  entity_id: `fx-${type}-${slug(name)}`,
  name,
  type: `urn:entity:${type}`,
  popularity,
  tags: tags.map(key => ({ id: tagUrn(key), name: TAGS[key].name })),
  location: extra.city ? `${extra.area}, ${extra.city}` : null,
  city: extra.city ?? null,
}));

export const FIXTURE_CITIES = ["London", "New York", "Toronto"];

const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const publicEntity = ({ city, ...e }) => e;

export function searchFixture({ query, types }) {
  const q = norm(query);
  const typeUrns = types?.length ? types.map(t => `urn:entity:${t}`) : null;
  const entities = ENTITIES.filter(e => {
    if (typeUrns && !typeUrns.includes(e.type)) return false;
    const n = norm(e.name);
    return n === q || n.includes(q) || (q.length > 4 && q.includes(n));
  })
    .sort((a, b) => (norm(b.name) === q) - (norm(a.name) === q) || b.popularity - a.popularity)
    .slice(0, 5)
    .map(publicEntity);

  const tags = Object.entries(TAGS)
    .filter(([, t]) => norm(t.name).includes(q) || t.keywords.some(k => k === q || q.includes(k) || k.includes(q)))
    .slice(0, 5)
    .map(([key, t]) => ({ id: tagUrn(key), name: t.name }));

  return { entities, tags };
}

export function insightsFixture({ entityIds = [], tagIds = [], excludeTagIds = [], type, city, take = 8 }) {
  const signal = new Set(tagIds);
  for (const id of entityIds) {
    ENTITIES.find(e => e.entity_id === id)?.tags.forEach(t => signal.add(t.id));
  }
  if (!signal.size) return { entities: [] };

  const cityKey = city ? norm(city) : null;
  const entities = ENTITIES.filter(e => e.type === `urn:entity:${type}`)
    .filter(e => !entityIds.includes(e.entity_id))
    .filter(e => !e.tags.some(t => excludeTagIds.includes(t.id)))
    .filter(e => type !== "place" || !cityKey || norm(e.city) === cityKey)
    .map(e => {
      const overlap = e.tags.filter(t => signal.has(t.id)).length;
      const cosine = overlap / Math.sqrt(e.tags.length * signal.size);
      return { ...publicEntity(e), affinity: Math.round((0.85 * cosine + 0.15 * e.popularity) * 1000) / 1000, overlap };
    })
    .filter(e => e.overlap > 0)
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, take)
    .map(({ overlap, ...e }) => e);

  return { entities };
}
