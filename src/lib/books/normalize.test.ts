import { normalizeGoogleList, normalizeVolumeDetails, normalizeVolumeSummary } from './normalize';
import type { GoogleBooksVolume } from './types';

describe('normalizeVolumeSummary', () => {
  it('maps core fields, extracts ISBN-13, and cleans the cover URL', () => {
    const v: GoogleBooksVolume = {
      id: 'abc',
      volumeInfo: {
        title: 'Dune',
        authors: ['Frank Herbert'],
        publishedDate: '1965-08-01',
        averageRating: 4.5,
        imageLinks: { thumbnail: 'http://books.google.com/books?id=x&edge=curl' },
        industryIdentifiers: [{ type: 'ISBN_13', identifier: '978-0441172719' }],
      },
    };
    const s = normalizeVolumeSummary(v);
    expect(s.volumeId).toBe('abc');
    expect(s.mediaType).toBe('book');
    expect(s.title).toBe('Dune');
    expect(s.authors).toEqual(['Frank Herbert']);
    expect(s.publishedYear).toBe(1965);
    expect(s.isbn13).toBe('9780441172719');
    expect(s.averageRating).toBe(4.5);
    expect(s.coverUrl).toBe('https://books.google.com/books?id=x');
  });

  it('falls back to Untitled when info is missing', () => {
    expect(normalizeVolumeSummary({ id: 'x' }).title).toBe('Untitled');
  });
});

describe('normalizeGoogleList', () => {
  it('computes totalPages from totalItems + pageSize (startIndex pagination)', () => {
    const list = { totalItems: 45, items: [{ id: 'a', volumeInfo: { title: 'A', authors: ['X'] } }] };
    const p = normalizeGoogleList(list, 1, 20);
    expect(p.page).toBe(1);
    expect(p.totalPages).toBe(3);
    expect(p.totalResults).toBe(45);
    expect(p.results).toHaveLength(1);
  });
});

describe('normalizeGoogleList de-duplication', () => {
  it('collapses editions with the same title+author, preferring one with a cover', () => {
    const list = {
      totalItems: 3,
      items: [
        { id: 'ed1', volumeInfo: { title: 'Dune', authors: ['Frank Herbert'] } },
        {
          id: 'ed2',
          volumeInfo: {
            title: 'Dune',
            authors: ['Frank Herbert'],
            imageLinks: { thumbnail: 'https://books.google.com/x' },
          },
        },
        { id: 'ed3', volumeInfo: { title: 'Dune Messiah', authors: ['Frank Herbert'] } },
      ],
    };
    const p = normalizeGoogleList(list, 1, 20);
    expect(p.results).toHaveLength(2); // Dune (deduped) + Dune Messiah
    const dune = p.results.find((b) => b.title === 'Dune');
    expect(dune?.volumeId).toBe('ed2'); // upgraded to the edition with a cover
    expect(dune?.coverUrl).toBe('https://books.google.com/x');
  });
});

describe('normalizeVolumeDetails', () => {
  it('adds description/publisher/pageCount/categories', () => {
    const d = normalizeVolumeDetails({
      id: 'z',
      volumeInfo: { title: 'T', description: '  hi ', publisher: 'P', pageCount: 300, categories: ['Fiction'] },
    });
    expect(d.description).toBe('hi');
    expect(d.publisher).toBe('P');
    expect(d.pageCount).toBe(300);
    expect(d.categories).toEqual(['Fiction']);
  });
});
