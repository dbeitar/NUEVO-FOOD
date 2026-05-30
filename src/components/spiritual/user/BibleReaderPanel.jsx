import { useEffect, useState } from 'react';
import { ArrowLeft, Search, Star } from 'lucide-react';
import { getBibleChapter, listBibleBooks, searchBible, toggleFavorite } from '../../../utils/spiritualApi';

export default function BibleReaderPanel({ onBack }) {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapterNum, setChapterNum] = useState(1);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    listBibleBooks().then(setBooks).catch(() => setBooks([]));
  }, []);

  const loadChapter = async (bookCode, num) => {
    const data = await getBibleChapter(bookCode, num);
    setChapter(data);
    setChapterNum(num);
  };

  const onSelectBook = (book) => {
    setSelectedBook(book);
    loadChapter(book.code, 1);
  };

  const onSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const rows = await searchBible(query.trim());
    setResults(rows);
    setSelectedBook(null);
    setChapter(null);
  };

  return (
    <div className="dashboard-main-view space-y-4">
      <header className="flex items-center gap-3">
        {onBack ? (
          <button type="button" className="btn-secondary" onClick={onBack}>
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            Volver
          </button>
        ) : null}
        <h2 className="text-2xl font-bold text-stone-900">Biblia</h2>
      </header>

      <form onSubmit={onSearch} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Buscar versículo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          <Search className="h-4 w-4" />
        </button>
      </form>

      {results.length > 0 && !chapter ? (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
              <p className="font-semibold text-stone-800">{r.reference}</p>
              <p className="text-stone-600">{r.text}</p>
              <button
                type="button"
                className="mt-2 text-amber-700 text-xs"
                onClick={() => toggleFavorite(r.id)}
              >
                <Star className="inline h-3 w-3" /> Favorito
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!selectedBook && !results.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {books.map((b) => (
            <button
              key={b.id}
              type="button"
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-sm hover:border-amber-300"
              onClick={() => onSelectBook(b)}
            >
              {b.name}
            </button>
          ))}
        </div>
      ) : null}

      {selectedBook && chapter ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">
              {chapter.book.name} {chapter.chapter_number}
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={chapterNum <= 1}
                onClick={() => loadChapter(selectedBook.code, chapterNum - 1)}
              >
                ←
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => loadChapter(selectedBook.code, chapterNum + 1)}
              >
                →
              </button>
            </div>
          </div>
          <div className="space-y-2 rounded-xl bg-white p-4">
            {chapter.verses.map((v) => (
              <p key={v.id} className="text-stone-700">
                <span className="mr-2 font-semibold text-amber-700">{v.verse_number}</span>
                {v.text}
                <button
                  type="button"
                  className="ml-2 text-xs text-stone-400 hover:text-amber-600"
                  onClick={() => toggleFavorite(v.id)}
                  aria-label="Favorito"
                >
                  <Star className="inline h-3 w-3" />
                </button>
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
