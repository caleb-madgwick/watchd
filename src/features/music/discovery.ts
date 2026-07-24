import { coverArtByReleaseGroup } from '@/lib/coverart/images';
import type { AlbumSummary } from '@/types/domain';

/**
 * Curated, verified music discovery. Every MBID was resolved from MusicBrainz
 * (and artist-checked) so covers load from Cover Art Archive by id — the Music
 * tab renders instantly with zero runtime network, avoiding MusicBrainz's
 * ~1 req/s rate limit that left the live rails empty on cold loads. Community
 * data layers on top once people start listening.
 */
type Seed = [mbid: string, title: string, artist: string, year: number];

function toAlbum([mbid, title, artist, year]: Seed): AlbumSummary {
  return {
    musicBrainzId: mbid,
    mediaType: 'album',
    title,
    artistNames: [artist],
    artistCredit: artist,
    coverUrl: coverArtByReleaseGroup(mbid),
    releaseYear: year,
    albumType: 'album',
  };
}

const FEATURED_SEED: Seed[] = [
  ['668e80e0-b35e-4471-9788-0a3d797fe42c', 'Melodrama', 'Lorde', 2017],
  ['0da340a0-6ad7-4fc2-a272-6f94393a7831', 'Blonde', 'Frank Ocean', 2016],
  ['d9103c72-3807-4378-9ce7-b6f3e8fdd547', 'To Pimp a Butterfly', 'Kendrick Lamar', 2015],
  ['b1392450-e666-3926-a536-22c65f834433', 'OK Computer', 'Radiohead', 1997],
  ['08aa7a6c-3e43-4459-87b2-e47faf3a088a', 'Currents', 'Tame Impala', 2015],
  ['aa997ea0-2936-40bd-884d-3af8a0e064dc', 'Random Access Memories', 'Daft Punk', 2013],
  ['a348ba2f-f8b3-4686-b928-e63d8d94d543', 'AM', 'Arctic Monkeys', 2013],
  ['1646286a-d0ad-4288-bfab-34b0fb7b22c1', 'SOS', 'SZA', 2022],
  ['9162580e-5df4-32de-80cc-f45a8d8a9b1d', 'Abbey Road', 'The Beatles', 1969],
  ['2c385052-5083-43a2-b1e5-36566d2ae3c0', 'RENAISSANCE', 'Beyoncé', 2022],
  ['ea39e3d6-4dd7-4ae4-b205-527657369155', 'Norman Fucking Rockwell', 'Lana Del Rey', 2019],
  ['f8f4167d-897c-4b25-a171-638374d1dfa4', 'channel ORANGE', 'Frank Ocean', 2012],
];

export const FEATURED_ALBUMS: AlbumSummary[] = FEATURED_SEED.map(toAlbum);

/** Featured albums — static and instant, so the Music tab never renders empty. */
export function useFeaturedAlbums(): { data: AlbumSummary[]; isLoading: boolean } {
  return { data: FEATURED_ALBUMS, isLoading: false };
}

const GENRE_SEED: { label: string; albums: Seed[] }[] = [
  {
    label: 'Pop',
    albums: [
      ['37cfca48-dabb-48b9-8a76-0ea08a965eb9', 'Future Nostalgia', 'Dua Lipa', 2020],
      ['e4174758-d333-4a8e-a31f-dd0edd51518e', '21', 'Adele', 2011],
      ['c1f22e07-7bdf-4a4f-8b50-7747c1091ef6', 'Lemonade', 'Beyoncé', 2016],
      ['df579c55-c9bb-4ab3-8811-73017e692422', 'Happier Than Ever', 'Billie Eilish', 2021],
      ['668e80e0-b35e-4471-9788-0a3d797fe42c', 'Melodrama', 'Lorde', 2017],
    ],
  },
  {
    label: 'Hip-hop',
    albums: [
      ['499c19c8-0dab-4824-884b-6191d145e95b', 'good kid, m.A.A.d city', 'Kendrick Lamar', 2012],
      ['5d6e21e1-deb5-428e-bb42-c2a567f3619b', 'My Beautiful Dark Twisted Fantasy', 'Kanye West', 2010],
      ['28298e2c-4d70-3eed-a0f5-a3280c662b3d', 'Illmatic', 'Nas', 1994],
      ['c0704c7d-dc5b-43cd-b372-8056a3bf7bb2', 'ASTROWORLD', 'Travis Scott', 2018],
      ['d9103c72-3807-4378-9ce7-b6f3e8fdd547', 'To Pimp a Butterfly', 'Kendrick Lamar', 2015],
    ],
  },
  {
    label: 'Rock',
    albums: [
      ['1b022e01-4da6-387b-8658-8678046e4cef', 'Nevermind', 'Nirvana', 1991],
      ['f5093c06-23e3-404f-aeaa-40f72885ee3a', 'The Dark Side of the Moon', 'Pink Floyd', 1973],
      ['79c5075c-630c-498d-b7c6-d83b4a982490', 'Back in Black', 'AC/DC', 1980],
      ['2e61da88-39e9-3473-81d2-c964cb394952', 'Led Zeppelin IV', 'Led Zeppelin', 1971],
      ['68cd609c-112c-3240-b6e4-9daa51e1f0a7', 'London Calling', 'The Clash', 1979],
      ['b1392450-e666-3926-a536-22c65f834433', 'OK Computer', 'Radiohead', 1997],
    ],
  },
  {
    label: 'Electronic',
    albums: [
      ['48117b90-a16e-34ca-a514-19c702df1158', 'Discovery', 'Daft Punk', 2001],
      ['cefd427e-185e-4a94-a6a9-a03d8a53b60a', 'Settle', 'Disclosure', 2013],
      ['a903a977-5932-4cc2-a064-57a596658b3d', 'In Colour', 'Jamie xx', 2015],
      ['1c58a37a-24dc-493d-a40e-227ba1523d35', 'Immunity', 'Jon Hopkins', 2013],
      ['aa997ea0-2936-40bd-884d-3af8a0e064dc', 'Random Access Memories', 'Daft Punk', 2013],
    ],
  },
  {
    label: 'Soul & R&B',
    albums: [
      ['ef15d15b-85e5-45b1-b143-493d71374281', "What's Going On", 'Marvin Gaye', 1971],
      ['ea88b09b-fd34-33cf-a3e5-25a3a2fb4c6f', 'Songs in the Key of Life', 'Stevie Wonder', 1976],
      ['8f892c1b-0709-4cf4-9711-493892a9eb9b', 'Ctrl', 'SZA', 2017],
      ['f8f4167d-897c-4b25-a171-638374d1dfa4', 'channel ORANGE', 'Frank Ocean', 2012],
      ['0da340a0-6ad7-4fc2-a272-6f94393a7831', 'Blonde', 'Frank Ocean', 2016],
    ],
  },
  {
    label: 'Indie',
    albums: [
      ['05affa96-5959-32da-8d75-1c9eb985ca59', 'Funeral', 'Arcade Fire', 2004],
      ['6d44b57a-2b9d-372a-b7c2-c670dca997d3', 'Is This It', 'The Strokes', 2003],
      ['187935b5-a0a4-3e6f-9684-48b67a5190a1', 'For Emma, Forever Ago', 'Bon Iver', 2007],
      ['e7227840-5ef2-3813-af26-15dab34e1a51', 'Turn On the Bright Lights', 'Interpol', 2002],
      ['b0864c80-2726-4761-bf66-a97610162a2c', 'Lonerism', 'Tame Impala', 2012],
    ],
  },
];

export interface GenreShelf {
  label: string;
  albums: AlbumSummary[];
}

/** Static genre shelves for the Music tab — instant, no rate limits. */
export const GENRE_SHELVES: GenreShelf[] = GENRE_SEED.map((g) => ({
  label: g.label,
  albums: g.albums.map(toAlbum),
}));
