import { useEffect, useState } from 'react';
import { ArrowLeft, Search, Star } from 'lucide-react';
import { getBibleChapter, listBibleBooks, searchBible, toggleFavorite } from '../../../utils/spiritualApi';
import './BibleReaderPanel.css';

export default function BibleReaderPanel({ onBack }) {
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapterNum, setChapterNum] = useState(1);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    setBooksLoading(true);
    setBooksError(null);
    listBibleBooks()
      .then((rows) => setBooks(Array.isArray(rows) ? rows : []))
      .catch(() => {
        setBooks([]);
        setBooksError('No se pudo cargar la Biblia. Verifica que el backend esté activo.');
      })
      .finally(() => setBooksLoading(false));
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
    <div className="dashboard-main-view bible-reader-panel space-y-4">
      <header className="flex items-center gap-3">
        {onBack ? (
          <button type="button" className="btn-secondary" onClick={onBack}>
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            Volver
          </button>
        ) : null}
        <h2 className="bible-reader-panel__title">Biblia</h2>
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
            <li key={r.id} className="bible-reader-panel__search-result">
              <p>{r.reference}</p>
              <p>{r.text}</p>
              <button
                type="button"
                className="bible-reader-panel__fav mt-2"
                onClick={() => toggleFavorite(r.id)}
              >
                <Star className="inline h-3 w-3" /> Favorito
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!selectedBook && !results.length ? (
        booksLoading ? (
          <p className="bible-reader-panel__verse">Cargando libros…</p>
        ) : booksError ? (
          <p className="bible-reader-panel__verse">{booksError}</p>
        ) : books.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {books.map((b) => (
            <button
              key={b.id}
              type="button"
              className="bible-reader-panel__book-btn"
              onClick={() => onSelectBook(b)}
            >
              {b.name}
            </button>
          ))}
        </div>
        ) : (
          <p className="bible-reader-panel__verse">
            No hay libros importados. Ejecuta <code>npm run spiritual:import-bible-full</code> en el servidor.
          </p>
        )
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
          <div className="bible-reader-panel__chapter space-y-2">
            {chapter.verses.map((v) => (
              <p key={v.id} className="bible-reader-panel__verse">
                <span className="bible-reader-panel__verse-num">{v.verse_number}</span>
                {v.text}
                <button
                  type="button"
                  className="bible-reader-panel__fav"
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
