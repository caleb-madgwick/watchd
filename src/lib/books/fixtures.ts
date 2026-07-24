/**
 * Bundled demo books so the app runs with zero keys (books demo mode). Clearly
 * fictionalised metadata — real data comes from Google Books / Open Library.
 */

import type { GoogleBooksList, GoogleBooksVolume } from './types';

export const FIXTURE_BOOKS: GoogleBooksVolume[] = [
  {
    id: 'demo-dune',
    volumeInfo: {
      title: 'Dune',
      authors: ['Frank Herbert'],
      publisher: 'Chilton Books',
      publishedDate: '1965-08-01',
      description:
        'On the desert planet Arrakis, a boy is caught between empire, prophecy and a spice that bends time. (Demo entry.)',
      pageCount: 412,
      categories: ['Fiction', 'Science Fiction'],
      averageRating: 4.5,
      language: 'en',
      imageLinks: { thumbnail: 'https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg' },
      industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780441172719' }],
    },
  },
  {
    id: 'demo-hobbit',
    volumeInfo: {
      title: 'The Hobbit',
      authors: ['J.R.R. Tolkien'],
      publisher: 'George Allen & Unwin',
      publishedDate: '1937-09-21',
      description: 'A reluctant hobbit is swept into a quest for a dragon-guarded hoard. (Demo entry.)',
      pageCount: 310,
      categories: ['Fiction', 'Fantasy'],
      averageRating: 4.7,
      language: 'en',
      imageLinks: { thumbnail: 'https://covers.openlibrary.org/b/isbn/9780547928227-M.jpg' },
      industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780547928227' }],
    },
  },
  {
    id: 'demo-project-hail-mary',
    volumeInfo: {
      title: 'Project Hail Mary',
      authors: ['Andy Weir'],
      publisher: 'Ballantine',
      publishedDate: '2021-05-04',
      description: 'A lone astronaut wakes with amnesia and the fate of Earth on his shoulders. (Demo entry.)',
      pageCount: 476,
      categories: ['Fiction', 'Science Fiction'],
      averageRating: 4.6,
      language: 'en',
      imageLinks: { thumbnail: 'https://covers.openlibrary.org/b/isbn/9780593135204-M.jpg' },
      industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780593135204' }],
    },
  },
];

export const FIXTURE_BOOK_DETAILS: Record<string, GoogleBooksVolume> = Object.fromEntries(
  FIXTURE_BOOKS.map((b) => [b.id, b]),
);

export function pagedBooks(items: GoogleBooksVolume[]): GoogleBooksList {
  return { totalItems: items.length, items };
}
