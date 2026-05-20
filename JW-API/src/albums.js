export const releasedAlbums = [
  {
    slug: "goodbye-good-riddance",
    title: "Goodbye & Good Riddance",
    releaseDate: "2018-05-23",
    type: "Studio album",
    coverArt:
      "https://coverartarchive.org/release/3127478a-b0f0-4044-94bf-3226da90b4d9/front-500",
    description:
      "The breakout debut that introduced Juice WRLD's melodic pain and made the archive impossible to ignore.",
    tracks: [
      "Intro",
      "All Girls Are the Same",
      "Lucid Dreams",
      "Lean Wit Me",
      "I'm Still",
      "Candles",
      "Scared of Love",
      "Used To",
      "Hurt Me",
      "Black & White",
      "Long Gone",
      "End of the Road",
      "I'll Be Fine",
      "734",
      "Lucid Dreams (Remix)",
    ],
  },
  {
    slug: "wrld-on-drugs",
    title: "WRLD ON DRUGS",
    releaseDate: "2018-10-19",
    type: "Collaboration album",
    coverArt:
      "https://coverartarchive.org/release/b40009d1-0993-4328-b6ac-c848a980e2b1/front-500",
    description:
      "A darker, louder team-up with Future that pushed Juice WRLD into a full album-length trap sprint.",
    tracks: [
      "Jet Lag",
      "Astronauts",
      "Fine China",
      "Red Bentley",
      "Oxy",
      "7 AM Freestyle",
      "Different",
      "Shorty",
      "Realer N Realer",
      "No Issue",
      "WRLD on Drugs",
      "Afterlife",
      "Ain't Living Right",
      "Transformer",
      "Hard Work Pays Off",
    ],
  },
  {
    slug: "death-race-for-love",
    title: "Death Race for Love",
    releaseDate: "2019-03-08",
    type: "Studio album",
    coverArt:
      "https://coverartarchive.org/release/ad6c3796-a0d9-4db0-8132-64223205100d/front-500",
    description:
      "The maximalist second album with bigger hooks, more range, and some of the strongest official cuts in the catalog.",
    tracks: [
      "Empty",
      "Maze",
      "HeMotions",
      "Demonz",
      "Fast",
      "Hear Me Calling",
      "Big",
      "Robbery",
      "Flaws and Sins",
      "Feeling",
      "Syphilis",
      "Who Shot Cupid?",
      "Ring Ring",
      "Desire",
      "Out My Way",
      "The Bees Knees",
      "ON GOD",
      "10 Feet",
      "Won't Let Go",
      "She's the One",
      "Rider",
      "Make Believe",
    ],
  },
  {
    slug: "legends-never-die",
    title: "Legends Never Die",
    releaseDate: "2020-07-10",
    type: "Posthumous album",
    coverArt:
      "https://coverartarchive.org/release/86e2df7d-59e0-436e-9083-830db62db09c/front-500",
    description:
      "The first posthumous release, built like a memorial and packed with many of the most recognizable official records.",
    tracks: [
      "Anxiety",
      "Conversations",
      "Titanic",
      "Bad Energy",
      "Righteous",
      "Blood On My Jeans",
      "Smile",
      "Tell Me U Luv Me",
      "Hate the Other Side",
      "Get Through It",
      "Life's A Mess",
      "Come & Go",
      "I Want It",
      "Fighting Demons",
      "Wishing Well",
      "Screw Juice",
      "Up Up and Away",
      "The Man, The Myth, The Legend",
      "Stay High",
      "Can't Die",
      "Man of the Year",
      "Juice WRLD Speaks From Heaven",
    ],
  },
  {
    slug: "fighting-demons",
    title: "Fighting Demons",
    releaseDate: "2021-12-10",
    type: "Posthumous album",
    coverArt:
      "https://coverartarchive.org/release/df9e8df0-3b8c-43cb-a4eb-f5487491d748/front-500",
    description:
      "A more conflicted, heavy set of official releases centered around grief, addiction, and inner collapse.",
    tracks: [
      "Burn",
      "Already Dead",
      "You Wouldn't Understand",
      "Wandered to LA",
      "Eminem Speaks",
      "Rockstar in His Prime",
      "Doom",
      "Go Hard",
      "Juice WRLD Speaks 2",
      "Not Enough",
      "Feline",
      "Relocate",
      "Until the Plug Comes Back Around",
      "From My Window",
      "Girl of My Dreams",
      "Feel Alone",
      "My Life in a Nutshell",
      "Go Hard 2.0",
    ],
  },
  {
    slug: "the-party-never-ends",
    title: "The Party Never Ends",
    releaseDate: "2024-11-29",
    type: "Posthumous album",
    coverArt:
      "https://coverartarchive.org/release/454e3e80-b263-4604-ad79-693f2fde37b0/front-500",
    description:
      "The late-era official release framed as one last stadium-sized sendoff with polished singles and fan-facing moments.",
    tracks: [
      "The Party Never Ends",
      "Misfit",
      "AGATS2 (Insecure)",
      "Lace It",
      "Cuffed",
      "Empty Out Your Pockets",
      "KTM Drip",
      "Love Letter",
      "Condone It",
      "Goodbye",
      "Party by Myself",
      "Adore You",
      "Celebrate",
      "Jeffery",
      "Barbarian",
      "Best Friend",
      "Floor It",
      "Oxycodone",
    ],
  },
];

const trackAliases = {
  Intro: ["GBGR Intro", "Goodbye and Good Riddance Intro"],
  "I'm Still": ["Im Still"],
  "Black & White": ["Black and White"],
  "I'll Be Fine": ["Ill Be Fine"],
  "Lucid Dreams (Remix)": ["Lucid Dreams Remix"],
  "WRLD on Drugs": ["Wrld On Drugs"],
  "Ain't Living Right": ["Aint Living Right"],
  HeMotions: ["Hemotions"],
  "Who Shot Cupid?": ["Who Shot Cupid"],
  "ON GOD": ["On God"],
  "Life's A Mess": ["Lifes A Mess"],
  "Come & Go": ["Come and Go"],
  "Can't Die": ["Cant Die"],
  "You Wouldn't Understand": ["You Wouldnt Understand"],
  "Wandered to LA": ["Wandered To LA"],
  "Go Hard 2.0": ["Go Hard 20", "Go Hard Pt 2"],
  "The Party Never Ends": ["TPNE", "The Party Never Ends Intro"],
  "AGATS2 (Insecure)": [
    "AGATS2",
    "All Girls Are The Same 2",
    "Insecure",
  ],
};

export function normalizeTrackTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findAlbumBySlug(slug) {
  return releasedAlbums.find((album) => album.slug === slug) ?? null;
}

export function getTrackAliases(title) {
  return trackAliases[title] ?? [];
}
